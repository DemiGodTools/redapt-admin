import { logActivity } from "@/lib/activityLogger";
import { NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { User } from "@/models/User.model";
import { Series } from "@/models/Series.model";
import { purgeExpiredDeletions } from "@/lib/accountDeletion";

export async function GET(req: Request) {
  try {
    await connectMongo();
    await purgeExpiredDeletions().catch(() => {});

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim().toLowerCase() || "";
    const startDate = searchParams.get("startDate")?.trim() || "";
    const endDate = searchParams.get("endDate")?.trim() || "";

    const query: any = { deletionStatus: "PENDING_DELETION" };

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { userId: { $regex: search, $options: "i" } },
      ];
    }

    if (startDate || endDate) {
      query.updatedAt = {};
      if (startDate) {
        query.updatedAt.$gte = new Date(startDate);
      }
      if (endDate) {
        // End of the selected day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.updatedAt.$lte = end;
      }
    }

    const pendingUsers = await User.collection
      .find(query)
      .project({
        name: 1,
        email: 1,
        userId: 1,
        deletionStatus: 1,
        deletionScheduledAt: 1,
        deletionToken: 1,
        deletionReason: 1,
        deletionDetails: 1,
        deletionRequestedFrom: 1,
        deletionRequestedName: 1,
        createdAt: 1,
        updatedAt: 1,
      })
      .sort({ deletionScheduledAt: 1 })
      .toArray();

    const now = Date.now();
    const formatted = pendingUsers.map((u: any) => {
      const scheduledMs = u.deletionScheduledAt ? new Date(u.deletionScheduledAt).getTime() : 0;
      const remainingMs = Math.max(0, scheduledMs - now);
      return {
        _id: u._id.toString(),
        name: u.name,
        email: u.email,
        userId: u.userId,
        deletionStatus: u.deletionStatus,
        deletionScheduledAt: u.deletionScheduledAt ? new Date(u.deletionScheduledAt).toISOString() : null,
        deletionToken: u.deletionToken,
        deletionReason: u.deletionReason || null,
        deletionDetails: u.deletionDetails || null,
        deletionRequestedFrom: u.deletionRequestedFrom || "app",
        deletionRequestedName: u.deletionRequestedName || null,
        remainingMs,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      };
    });

    const totalActive = await User.collection.countDocuments({ deletionStatus: { $ne: "PENDING_DELETION" } });

    return NextResponse.json({
      success: true,
      data: formatted,
      stats: {
        totalPending: formatted.length,
        totalActive,
      },
    });
  } catch (error) {
    console.error("Admin Deletions GET Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectMongo();

    const body = await req.json().catch(() => ({}));
    const { userId, action } = body;

    if (!userId || !action) {
      return NextResponse.json(
        { success: false, message: "userId and action ('cancel' | 'purge') are required" },
        { status: 400 }
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    if (action === "cancel") {
      await User.collection.updateOne(
        { _id: user._id },
        {
          $set: {
            deletionStatus: "ACTIVE",
            updatedAt: new Date(),
          },
          $unset: {
            deletionScheduledAt: "",
            deletionToken: "",
          },
        }
      );

      await logActivity({
        action: "DELETION_CANCELLED",
        category: "auth",
        title: user.email,
        description: "Admin restored account from pending deletion",
        performedBy: "Master Admin",
        performedByRole: "master_admin",
        metadata: { userId: user._id.toString() },
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        message: `Deletion request for ${user.email} has been cancelled. Account restored.`,
      });
    }

    if (action === "purge") {
      // Immediate force purge: unlink references and delete user document
      try {
        await Series.updateMany(
          { participants: user._id },
          { $pull: { participants: user._id } }
        ).catch(() => {});
      } catch {}

      await User.collection.deleteOne({ _id: user._id });

      await logActivity({
        action: "DELETION_PURGED",
        category: "auth",
        title: user.email,
        description: "Admin permanently purged user account and anonymized records",
        performedBy: "Master Admin",
        performedByRole: "master_admin",
        metadata: { userId: user._id.toString() },
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        message: `User ${user.email} has been permanently deleted and comments anonymized.`,
      });
    }

    return NextResponse.json(
      { success: false, message: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Admin Deletions POST Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
