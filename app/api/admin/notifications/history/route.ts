import { NextRequest, NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { NotificationLog } from "@/models/NotificationLog.model";
import { PushToken } from "@/models/PushToken.model";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectMongo();

    // Lightweight fetch of only last 15 logs without heavy countDocuments on PushTokens
    const logs = await NotificationLog.find({})
      .sort({ sentAt: -1 })
      .limit(15)
      .lean();

    return NextResponse.json({
      success: true,
      data: logs,
    });
  } catch (error: any) {
    console.error("History fetch error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to fetch history" },
      { status: 500 }
    );
  }
}
