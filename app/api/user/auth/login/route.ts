import { logActivity } from "@/lib/activityLogger";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectMongo from "@/lib/connectMongo";
import { User } from "@/models/User.model";
import "@/models/Chapter.model";
import "@/models/Category.model";
import { Comment } from "@/models/Comment.model";
import { purgeExpiredDeletions } from "@/lib/accountDeletion";

interface GoogleTokenInfo {
  email?: string;
  name?: string;
  picture?: string;
  sub?: string;
  error_description?: string;
}

export async function POST(req: Request) {
  try {
    const { googleAccessToken, idToken } = await req.json();

    const isJwt = (t?: string) => typeof t === "string" && (t.startsWith("ey") || t.split(".").length === 3);

    // Determine candidate ID token and access token
    const candidateIdToken = idToken || (isJwt(googleAccessToken) ? googleAccessToken : undefined);
    const candidateAccessToken =
      (!isJwt(googleAccessToken) ? googleAccessToken : undefined) ||
      (!isJwt(idToken) ? idToken : undefined);

    if (!candidateIdToken && !candidateAccessToken) {
      return NextResponse.json(
        { success: false, message: "Missing Google token" },
        { status: 400 }
      );
    }

    let email: string | undefined;
    let name: string | undefined;
    let picture: string | undefined;

    // 1. Try ID token verification if available
    if (candidateIdToken) {
      try {
        const googleRes = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${candidateIdToken}`
        );
        if (googleRes.ok) {
          const data: GoogleTokenInfo = await googleRes.json();
          if (data?.email) {
            email = data.email;
            name = data.name;
            picture = data.picture;
          }
        }
      } catch (err) {
        console.warn("ID token verification failed, trying fallback:", err);
      }
    }

    // 2. Fallback to access token userinfo verification if email not resolved yet
    if (!email && candidateAccessToken) {
      try {
        const userInfoRes = await fetch(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: {
              Authorization: `Bearer ${candidateAccessToken}`,
            },
          }
        );

        if (userInfoRes.ok) {
          const googleUser: GoogleTokenInfo = await userInfoRes.json();
          email = googleUser?.email;
          name = googleUser?.name;
          picture = googleUser?.picture;
        }
      } catch (err) {
        console.warn("Access token verification failed:", err);
      }
    }

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired Google token" },
        { status: 401 }
      );
    }

    // 2. Connect DB & Find/Create User
    await connectMongo();
    await purgeExpiredDeletions().catch(() => {});

    let user = await User.findOne({ email });

    const isNewUser = !user;
    let wasDeletionCancelled = false;
    if (user && user.deletionStatus === "PENDING_DELETION") {
      user.deletionStatus = "ACTIVE";
      user.deletionScheduledAt = undefined;
      user.deletionToken = undefined;
      await user.save();
      wasDeletionCancelled = true;
    }

    if (user && user.subscription?.plan > 0 && user.subscription?.expiresOn) {
      const expiryMs = new Date(user.subscription.expiresOn).getTime();
      if (!isNaN(expiryMs) && expiryMs <= Date.now()) {
        user.subscription.plan = 0;
        await user.save();
      }
    }

    if (!user) {
      const baseId = email.split("@")[0];
      const cleaned = baseId.replace(/[^a-zA-Z]/g, "");
      const userId = cleaned || `user${Date.now()}`;

      user = await User.create({
        email,
        name: name || baseId,
        userId,
        image: picture,
      });
    }

    // Update user login status
    await User.collection.updateOne(
      { _id: user._id },
      {
        $set: {
          isLoggedIn: true,
          lastLoginAt: new Date(),
        },
      }
    );

    // ⚡ Relink any past comments from this user's email so they never show as anonymous or broken
    try {
      await Comment.updateMany(
        { userEmail: user.email },
        {
          $set: {
            by: user._id,
            userName: user.name,
            userHandle: user.userId,
            userImage: user.image,
          },
        }
      );
    } catch (err) {
      console.warn("Could not relink comments on login:", err);
    }

    // 3. Issue internal JWT
    const jwtSecret =
      process.env.JWT_SECRET ||
      process.env.NEXTAUTH_SECRET ||
      "readapt_super_secret_jwt_key_12345";

    // Log activity
    if (isNewUser) {
      logActivity({
        action: "USER_SIGNUP",
        category: "auth",
        title: user.name ? `${user.name} (${user.email})` : user.email,
        description: "New user registered with Google account",
        performedBy: user.name || user.email,
        performedByRole: "user",
        metadata: { userId: user._id.toString() },
      }).catch(() => {});
    } else if (wasDeletionCancelled) {
      logActivity({
        action: "DELETION_CANCELLED",
        category: "auth",
        title: user.email,
        description: "User logged in and cancelled pending deletion request",
        performedBy: user.name || user.email,
        performedByRole: "user",
      }).catch(() => {});
    } else {
      logActivity({
        action: "USER_LOGIN",
        category: "auth",
        title: user.name ? `${user.name} (${user.email})` : user.email,
        description: "User session authenticated",
        performedBy: user.name || user.email,
        performedByRole: "user",
      }).catch(() => {});
    }

    const token = jwt.sign(
      {
        _id: user._id,
        email: user.email,
        userId: user.userId || user._id?.toString() || "user",
      },
      jwtSecret.trim(),
      { expiresIn: "30d" }
    );

    const populatedUser = await User.findById(user._id)
      .populate("likes")
      .populate({
        path: "recentReads.chapter",
        populate: { path: "category" },
      })
      .select("-__v");

    return NextResponse.json({
      success: true,
      token,
      expiry: Date.now() + 1000 * 60 * 60 * 24 * 30,
      user: populatedUser || user,
      wasDeletionCancelled,
    });
  } catch (error) {
    console.error("Google Login Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
