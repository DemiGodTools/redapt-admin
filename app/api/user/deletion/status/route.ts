import { NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { User } from "@/models/User.model";
import { maskEmail, purgeExpiredDeletions } from "@/lib/accountDeletion";

export async function GET(req: Request) {
  try {
    await connectMongo();
    await purgeExpiredDeletions().catch(() => {});

    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token")?.trim();
    const email = searchParams.get("email")?.trim().toLowerCase();

    if (!token && !email) {
      return NextResponse.json(
        { success: false, message: "Valid deletion token or registered email is required." },
        { status: 400 }
      );
    }

    const query: any = {};
    if (token) {
      query.deletionToken = token;
    } else if (email) {
      query.email = email;
    }

    // Direct collection query ensures fields are never filtered by outdated Mongoose schemas
    const user: any = await User.collection.findOne(query);

    if (!user) {
      return NextResponse.json({
        success: true,
        status: "NOT_FOUND",
        message: "No active deletion request found for this account, or the account has already been permanently deleted.",
      });
    }

    const isPending = user.deletionStatus === "PENDING_DELETION";
    const now = Date.now();
    const scheduledMs = user.deletionScheduledAt
      ? new Date(user.deletionScheduledAt).getTime()
      : 0;
    const remainingMs = Math.max(0, scheduledMs - now);

    return NextResponse.json({
      success: true,
      status: user.deletionStatus || "ACTIVE",
      email: maskEmail(user.email),
      rawEmail: user.email,
      scheduledAt: user.deletionScheduledAt ? new Date(user.deletionScheduledAt).toISOString() : null,
      remainingMs: isPending ? remainingMs : 0,
      token: user.deletionToken || null,
    });
  } catch (error) {
    console.error("Deletion status check error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
