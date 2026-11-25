import { NextRequest, NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { PushToken } from "@/models/PushToken.model";
import { getFirebaseMessaging } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await connectMongo();

    const body = await req.json();
    const { token, platform, email, userId } = body;

    if (!token || typeof token !== "string" || !token.trim()) {
      return NextResponse.json(
        { success: false, message: "Valid push token is required" },
        { status: 400 }
      );
    }

    const cleanToken = token.trim();
    const isExpoToken =
      cleanToken.startsWith("ExponentPushToken[") ||
      cleanToken.startsWith("ExpoPushToken[");
    const tokenType: "expo" | "fcm" = isExpoToken ? "expo" : "fcm";

    let subscribedToTopic = false;

    // If native FCM token, subscribe it to 'all_users' topic in Firebase Admin SDK
    if (tokenType === "fcm") {
      try {
        const messaging = getFirebaseMessaging();
        const subResponse = await messaging.subscribeToTopic([cleanToken], "all_users");
        if (subResponse.successCount > 0) {
          subscribedToTopic = true;
        } else if (subResponse.errors && subResponse.errors.length > 0) {
          const errMsg = String(subResponse.errors[0]?.error || "");
          if (!errMsg.includes("topicSubscriptions.create")) {
            console.warn("FCM topic subscription error:", subResponse.errors[0]?.error);
          }
        }
      } catch (fcmErr) {
        console.warn("Could not subscribe token to FCM topic 'all_users':", fcmErr);
      }
    }

    // Upsert token in MongoDB
    await PushToken.findOneAndUpdate(
      { token: cleanToken },
      {
        token: cleanToken,
        type: tokenType,
        platform: platform || "android",
        userId: userId || null,
        email: email ? email.toLowerCase().trim() : null,
        subscribedToTopic,
        lastActiveAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({
      success: true,
      type: tokenType,
      subscribedToTopic,
      message: "Push token registered successfully",
    });
  } catch (error: any) {
    console.error("Error registering push token:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
