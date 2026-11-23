import { NextRequest, NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { getFirebaseMessaging } from "@/lib/firebaseAdmin";
import { NotificationLog } from "@/models/NotificationLog.model";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await connectMongo();

    const body = await req.json();
    const { title, message, imageUrl, targetScreen, extraData } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { success: false, message: "Notification title is required" },
        { status: 400 }
      );
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { success: false, message: "Notification message is required" },
        { status: 400 }
      );
    }

    const cleanTitle = title.trim();
    const cleanBody = message.trim();
    const cleanImage = (imageUrl || "").trim();
    const cleanScreen = (targetScreen || "Home").trim();

    // Prepare FCM Topic Message payload
    const messaging = getFirebaseMessaging();

    const fcmPayload: any = {
      topic: "all_users",
      notification: {
        title: cleanTitle,
        body: cleanBody,
        ...(cleanImage ? { imageUrl: cleanImage } : {}),
      },
      data: {
        targetScreen: cleanScreen,
        title: cleanTitle,
        body: cleanBody,
        ...(cleanImage ? { image: cleanImage } : {}),
        ...(typeof extraData === "object" && extraData !== null ? extraData : {}),
      },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "default",
          ...(cleanImage ? { imageUrl: cleanImage } : {}),
        },
      },
    };

    let messageId = "";
    try {
      messageId = await messaging.send(fcmPayload);
    } catch (fcmErr: any) {
      console.error("FCM Send error:", fcmErr);

      // Log failed attempt
      await NotificationLog.create({
        title: cleanTitle,
        body: cleanBody,
        imageUrl: cleanImage,
        targetScreen: cleanScreen,
        topic: "all_users",
        status: "FAILED",
        errorMessage: fcmErr?.message || "FCM transmission failed",
        sentAt: new Date(),
      });

      return NextResponse.json(
        {
          success: false,
          message: fcmErr?.message || "Failed to broadcast notification via FCM",
        },
        { status: 500 }
      );
    }

    // Also fan out to Expo Push Service for any devices currently running via Expo Go
    try {
      const { PushToken } = await import("@/models/PushToken.model");
      const expoTokens = await PushToken.find({ type: "expo" }).distinct("token");

      if (expoTokens && expoTokens.length > 0) {
        const expoMessages = expoTokens.map((to: string) => ({
          to,
          sound: "default",
          title: cleanTitle,
          body: cleanBody,
          data: {
            targetScreen: cleanScreen,
            title: cleanTitle,
            body: cleanBody,
            image: cleanImage,
          },
        }));

        // Send to Expo Push API
        fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Accept-encoding": "gzip, deflate",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(expoMessages),
        }).catch((err) => console.warn("Expo push fanout warning:", err));
      }
    } catch (expoErr) {
      console.warn("Expo token check warning:", expoErr);
    }

    // Record successful broadcast in history log
    const logEntry = await NotificationLog.create({
      title: cleanTitle,
      body: cleanBody,
      imageUrl: cleanImage,
      targetScreen: cleanScreen,
      topic: "all_users",
      status: "SENT",
      messageId,
      sentAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Broadcast notification sent successfully to all users!",
      data: logEntry,
    });
  } catch (error: any) {
    console.error("Broadcast handler error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
