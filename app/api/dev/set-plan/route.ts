// File: app/api/dev/set-plan/route.ts
import { NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { User } from "@/models/User.model";

export async function GET(req: Request) {
  try {
    await connectMongo();
    
    // Get parameters from URL
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    const plan = searchParams.get("plan"); // 0 for Free, 1 for Basic, 2 for Pro
    const expired = searchParams.get("expired");

    if (!email) {
      return NextResponse.json({ success: false, message: "Email is required in URL" }, { status: 400 });
    }

    let updateData: any = {
      "subscription.plan": Number(plan) || 0,
      "subscription.active": expired === "true" ? false : true,
    };

    // Set expiration date
    if (expired === "true") {
      updateData["subscription.expiresOn"] = new Date(Date.now() - 1000000); // Past date
    } else {
      updateData["subscription.expiresOn"] = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days future
    }

    const user = await User.findOneAndUpdate(
      { email },
      { $set: updateData },
      { new: true }
    );

    if (!user) return NextResponse.json({ success: false, message: "User not found" });

    return NextResponse.json({
      success: true,
      message: `Plan updated successfully for ${email}`,
      currentPlan: user.subscription.plan,
      isExpired: expired === "true"
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}