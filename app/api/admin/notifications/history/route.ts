import { NextRequest, NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { NotificationLog } from "@/models/NotificationLog.model";
import { PushToken } from "@/models/PushToken.model";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectMongo();

    const [logs, totalRegisteredDevices, fcmCount, expoCount] = await Promise.all([
      NotificationLog.find({}).sort({ sentAt: -1 }).limit(30).lean(),
      PushToken.countDocuments({}),
      PushToken.countDocuments({ type: "fcm" }),
      PushToken.countDocuments({ type: "expo" }),
    ]);

    return NextResponse.json({
      success: true,
      data: logs,
      stats: {
        total: totalRegisteredDevices,
        fcm: fcmCount,
        expo: expoCount,
      },
    });
  } catch (error: any) {
    console.error("History fetch error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to fetch history" },
      { status: 500 }
    );
  }
}
