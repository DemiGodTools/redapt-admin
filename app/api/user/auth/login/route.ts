import crypto from "crypto";
import { logActivity } from "@/lib/activityLogger";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectMongo from "@/lib/connectMongo";
import { User } from "@/models/User.model";
import "@/models/Chapter.model";
import "@/models/Category.model";
import { Comment } from "@/models/Comment.model";
import { purgeExpiredDeletions } from "@/lib/accountDeletion";
import { ensureUserReferralCode } from "@/lib/referralHelper";
import { checkRateLimit, getClientIp, getJwtSigningSecret } from "@/lib/userAuth";

interface GoogleTokenInfo {
  email?: string;
  email_verified?: boolean | string;
  aud?: string;
  azp?: string;
  name?: string;
  picture?: string;
  sub?: string;
  error_description?: string;
}

const DEFAULT_GOOGLE_CLIENT_ID =
  "1001972321456-g4vaean9s9k5401fnhqaum1erft9q2vh.apps.googleusercontent.com";

function getAllowedGoogleAudiences(): Set<string> {
  const allowed = new Set<string>();
  const envWebId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.replace(/["']/g, "").trim();
  const envServerId = process.env.GOOGLE_CLIENT_ID?.replace(/["']/g, "").trim();
  if (envWebId) allowed.add(envWebId);
  if (envServerId) allowed.add(envServerId);
  allowed.add(DEFAULT_GOOGLE_CLIENT_ID);
  return allowed;
}

function generateUniqueHandle(email: string, suffixLength: number = 6): string {
  const baseId = email.split("@")[0] || "reader";
  const cleaned = baseId.replace(/[^a-zA-Z]/g, "").toLowerCase();
  const prefix = cleaned.slice(0, 12) || "reader";
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, suffixLength);
  return `${prefix}_${suffix}`;
}

export async function POST(req: Request) {
  try {
    // 1. Sliding-window IP rate limit to block brute-force / bot token spamming
    const clientIp = getClientIp(req);
    const rate = checkRateLimit(`login:${clientIp}`, 15, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: "Too many sign-in attempts. Please wait a minute and try again.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfterSec) },
        }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, message: "Invalid request payload" },
        { status: 400 }
      );
    }

    const { googleAccessToken, idToken } = body;

    const isJwt = (t?: unknown): boolean =>
      typeof t === "string" &&
      t.length >= 20 &&
      t.length <= 4096 &&
      (t.startsWith("ey") || t.split(".").length === 3);

    // Determine candidate ID token and access token
    const candidateIdToken: string | undefined = isJwt(idToken)
      ? (idToken as string)
      : isJwt(googleAccessToken)
      ? (googleAccessToken as string)
      : undefined;
    const candidateAccessToken: string | undefined =
      typeof googleAccessToken === "string" && !isJwt(googleAccessToken) && googleAccessToken.length <= 4096
        ? googleAccessToken
        : typeof idToken === "string" && !isJwt(idToken) && idToken.length <= 4096
        ? idToken
        : undefined;

    if (!candidateIdToken && !candidateAccessToken) {
      return NextResponse.json(
        { success: false, message: "Missing or invalid Google token" },
        { status: 400 }
      );
    }

    const allowedAudiences = getAllowedGoogleAudiences();
    let email: string | undefined;
    let name: string | undefined;
    let picture: string | undefined;

    // 2. Cryptographically verify Google ID token + Audience (aud) + email_verified
    if (candidateIdToken) {
      try {
        const googleRes = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(candidateIdToken)}`
        );
        if (googleRes.ok) {
          const data: GoogleTokenInfo = await googleRes.json();
          const isEmailVerified =
            data?.email_verified === true || data?.email_verified === "true";
          const tokenAud = (data?.aud || "").trim();
          const isAudValid = Boolean(tokenAud && allowedAudiences.has(tokenAud));

          if (data?.email && isEmailVerified && isAudValid) {
            email = data.email.trim().toLowerCase();
            name = data.name;
            picture = data.picture;
          } else if (data?.email && !isAudValid) {
            console.warn("Rejected Google id_token with foreign audience:", tokenAud);
            return NextResponse.json(
              { success: false, message: "Unauthorized OAuth client audience" },
              { status: 401 }
            );
          }
        }
      } catch (err) {
        console.warn("ID token verification failed, trying fallback:", err);
      }
    }

    // 3. Fallback to access token verification (must also verify audience & verified email)
    if (!email && candidateAccessToken) {
      try {
        const [tokenInfoRes, userInfoRes] = await Promise.all([
          fetch(
            `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(candidateAccessToken)}`
          ),
          fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: {
              Authorization: `Bearer ${candidateAccessToken}`,
            },
          }),
        ]);

        if (tokenInfoRes.ok && userInfoRes.ok) {
          const tokenMeta: GoogleTokenInfo = await tokenInfoRes.json();
          const googleUser: GoogleTokenInfo = await userInfoRes.json();
          const tokenAud = (tokenMeta?.aud || tokenMeta?.azp || "").trim();
          const isAudValid = Boolean(tokenAud && allowedAudiences.has(tokenAud));
          const isEmailVerified =
            googleUser?.email_verified === true ||
            googleUser?.email_verified === "true" ||
            tokenMeta?.email_verified === true ||
            tokenMeta?.email_verified === "true";

          if (googleUser?.email && isEmailVerified && isAudValid) {
            email = googleUser.email.trim().toLowerCase();
            name = googleUser.name;
            picture = googleUser.picture;
          } else if (googleUser?.email && !isAudValid) {
            console.warn("Rejected Google access_token with foreign audience:", tokenAud);
          }
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

    // 4. Connect DB & Find/Create User cleanly
    await connectMongo();
    await purgeExpiredDeletions().catch(() => {});

    let user = await User.findOne({ email });
    let isNewUser = !user;
    let wasDeletionCancelled = false;

    const isEarlyReaderPhase = process.env.EARLY_READER_PHASE !== "false";

    if (!user) {
      const createUserWithHandle = async (suffixLen: number) => {
        const userId = generateUniqueHandle(email!, suffixLen);
        return await User.create({
          email,
          name: name || email!.split("@")[0] || "Reader",
          userId,
          image: picture,
          isEarlyReader: isEarlyReaderPhase,
          hasClaimedEarlyBadge: false,
        });
      };

      try {
        user = await createUserWithHandle(6);
      } catch (createErr: any) {
        if (createErr?.code === 11000) {
          // Concurrent double-tap signup on same email -> safely fetch existing account
          if (createErr?.keyPattern?.email) {
            user = await User.findOne({ email });
            isNewUser = false;
          } else {
            // 1-in-16M handle collision -> atomic retry with 8-char suffix
            user = await createUserWithHandle(8);
          }
        } else {
          throw createErr;
        }
      }

      if (user && isNewUser) {
        await ensureUserReferralCode(user);
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Failed to create user session" },
        { status: 500 }
      );
    }

    // Cancel pending deletion on sign-in & normalize profile completion / subscription expiry
    let needsSave = false;
    if (user.deletionStatus === "PENDING_DELETION") {
      user.deletionStatus = "ACTIVE";
      user.deletionScheduledAt = undefined;
      user.deletionToken = undefined;
      wasDeletionCancelled = true;
      needsSave = true;
    }

    if (user.subscription?.plan > 0 && user.subscription?.expiresOn) {
      const expiryMs = new Date(user.subscription.expiresOn).getTime();
      if (!isNaN(expiryMs) && expiryMs <= Date.now()) {
        user.subscription.plan = 0;
        needsSave = true;
      }
    }

    // Auto-heal existing users who already filled profession/profile via Profile Edit
    if (
      !isNewUser &&
      user.isProfileCompleted === false &&
      typeof user.profession === "string" &&
      user.profession.trim().length > 0
    ) {
      user.isProfileCompleted = true;
      needsSave = true;
    }

    if (!user.referralCode) {
      await ensureUserReferralCode(user);
    }
    if (user.isEarlyReader === undefined) {
      user.isEarlyReader = isEarlyReaderPhase;
      needsSave = true;
    }

    if (needsSave) {
      await user.save();
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

    // Relink any past comments from this user's email
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

    // 5. Issue internal JWT with canonical normalized secret
    const jwtSecret = getJwtSigningSecret();

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
      jwtSecret,
      { expiresIn: "30d" }
    );

    const populatedUser = await User.findById(user._id)
      .populate("likes")
      .populate({
        path: "recentReads.chapter",
        populate: { path: "category" },
      })
      .select("-__v");

    const userObj = (populatedUser ? populatedUser.toObject() : user.toObject ? user.toObject() : user) as any;
    userObj.isEarlyBadgeLive = process.env.EARLY_BADGE_LIVE === "true";

    return NextResponse.json({
      success: true,
      token,
      expiry: Date.now() + 1000 * 60 * 60 * 24 * 30,
      user: userObj,
      isNewUser: Boolean(isNewUser),
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
