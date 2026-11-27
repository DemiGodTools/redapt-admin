import { NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { User } from "@/models/User.model";
import { logActivity } from "@/lib/activityLogger";
import { getAuthenticatedUser } from "@/lib/userAuth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const authUser = await getAuthenticatedUser(req);
    const email = authUser?.email || null;

    if (!email) {
      return NextResponse.json({ success: true, message: "Session ended" });
    }

    await connectMongo();
    const user = await User.findOne({ email });
    if (user) {
      await User.collection.updateOne(
        { _id: user._id },
        {
          $set: {
            isLoggedIn: false,
            lastLogoutAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );

      logActivity({
        action: "USER_LOGOUT",
        category: "auth",
        title: user.name ? `${user.name} (${user.email})` : user.email,
        description: "User logged out of mobile app",
        performedBy: user.name || user.email,
        performedByRole: "user",
        metadata: { userId: user._id.toString() },
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, message: "Logged out successfully" });
  } catch (error: any) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { success: true, message: "Session ended" },
      { status: 200 }
    );
  }
}
