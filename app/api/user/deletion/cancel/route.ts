import { logActivity } from "@/lib/activityLogger";
import { NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { User } from "@/models/User.model";
import { maskEmail } from "@/lib/accountDeletion";

export async function POST(req: Request) {
  try {
    await connectMongo();

    const body = await req.json().catch(() => ({}));
    const token = body?.token?.trim();
    const email = body?.email?.trim().toLowerCase();

    if (!token && !email) {
      return NextResponse.json(
        { success: false, message: "Valid deletion token or email is required to cancel deletion." },
        { status: 400 }
      );
    }

    const query: any = {};
    if (token) query.deletionToken = token;
    else if (email) query.email = email;

    const user: any = await User.collection.findOne(query);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Account not found or invalid token." },
        { status: 404 }
      );
    }

    if (user.deletionStatus !== "PENDING_DELETION") {
      await logActivity({
      action: "DELETION_CANCELLED",
      category: "auth",
      title: user.email,
      description: "Account deletion request cancelled by user on portal",
      performedBy: user.name || user.email,
      performedByRole: "user",
    }).catch(() => {});

    return NextResponse.json({
        success: true,
        message: "Your account is already active.",
        status: "ACTIVE",
      });
    }

    // Cancel deletion and restore directly
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

    console.log(`[Account Deletion] Restored user: ${user.email}`);

    return NextResponse.json({
      success: true,
      message: "Your deletion request has been cancelled. Your account is active and safe.",
      status: "ACTIVE",
      email: maskEmail(user.email),
    });
  } catch (error) {
    console.error("Deletion cancel error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
