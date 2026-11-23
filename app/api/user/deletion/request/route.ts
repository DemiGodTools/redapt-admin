import { logActivity } from "@/lib/activityLogger";
import { NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { User } from "@/models/User.model";
import { generateDeletionToken, maskEmail, purgeExpiredDeletions } from "@/lib/accountDeletion";
import { getAuthenticatedUser } from "@/lib/userAuth";

export async function POST(req: Request) {
  try {
    await connectMongo();
    await purgeExpiredDeletions().catch(() => {});

    const authUser = await getAuthenticatedUser(req);
    let email = authUser?.email || null;

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: valid session token required." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return NextResponse.json(
        { success: false, message: `No user account found for ${cleanEmail}.` },
        { status: 404 }
      );
    }

    // 48 hours grace period
    const GRACE_PERIOD_MS = 48 * 60 * 60 * 1000;
    const scheduledAt = new Date(Date.now() + GRACE_PERIOD_MS);
    const token = generateDeletionToken();

    // Direct MongoDB update to bypass any cached Mongoose model schemas in hot reload
    const updateFields: Record<string, unknown> = {
      deletionStatus: "PENDING_DELETION",
      deletionScheduledAt: scheduledAt,
      deletionToken: token,
      updatedAt: new Date(),
    };

    if (body?.reason) updateFields.deletionReason = String(body.reason).trim();
    if (body?.details) updateFields.deletionDetails = String(body.details).trim();
    if (body?.name) updateFields.deletionRequestedName = String(body.name).trim();
    if (body?.source) updateFields.deletionRequestedFrom = String(body.source).trim();

    await User.collection.updateOne(
      { _id: user._id },
      {
        $set: updateFields,
      }
    );

    console.log(`[Account Deletion] Successfully scheduled deletion for user: ${user.email}, token: ${token}`);

    await logActivity({
      action: "DELETION_REQUESTED",
      category: "auth",
      title: user.name ? `${user.name} (${user.email})` : user.email,
      description: body?.reason
        ? `Account deletion scheduled: ${body.reason}`
        : "Account deletion scheduled (48h grace window)",
      performedBy: user.name || user.email,
      performedByRole: "user",
      metadata: {
        userId: user._id.toString(),
        reason: body?.reason,
        details: body?.details,
        source: body?.source || "app",
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Your account deletion request has been scheduled.",
      deletionToken: token,
      scheduledAt: scheduledAt.toISOString(),
      email: maskEmail(user.email),
      rawEmail: user.email,
      graceHours: 48,
    });
  } catch (error) {
    console.error("Deletion request error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
