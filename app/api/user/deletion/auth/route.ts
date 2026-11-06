import { NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { User } from "@/models/User.model";
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
    const body = await req.json().catch(() => ({}));
    const { idToken, googleAccessToken, manualEmail } = body;

    let email: string | undefined;
    let name: string | undefined;
    let picture: string | undefined;

    const isJwt = (t?: string) => typeof t === "string" && (t.startsWith("ey") || t.split(".").length === 3);

    const candidateIdToken = idToken || (isJwt(googleAccessToken) ? googleAccessToken : undefined);
    const candidateAccessToken = (!isJwt(googleAccessToken) ? googleAccessToken : undefined) || (!isJwt(idToken) ? idToken : undefined);

    // 1. Verify with Google ID token
    if (candidateIdToken) {
      try {
        const googleRes = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${candidateIdToken}`
        );
        if (googleRes.ok) {
          const data: GoogleTokenInfo = await googleRes.json();
          if (data?.email) {
            email = data.email.toLowerCase().trim();
            name = data.name;
            picture = data.picture;
          }
        }
      } catch (err) {
        console.warn("[Deletion Auth] ID token verification failed:", err);
      }
    }

    // 2. Fallback to access token verification
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
          if (googleUser?.email) {
            email = googleUser.email.toLowerCase().trim();
            name = googleUser.name;
            picture = googleUser.picture;
          }
        }
      } catch (err) {
        console.warn("[Deletion Auth] Access token verification failed:", err);
      }
    }

    // 3. Fallback for manual email lookup if explicitly provided (e.g., token check)
    if (!email && manualEmail && typeof manualEmail === "string") {
      email = manualEmail.trim().toLowerCase();
    }

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          message: "Unable to verify Google authentication. Please sign in with Google again.",
        },
        { status: 400 }
      );
    }

    await connectMongo();
    await purgeExpiredDeletions().catch(() => {});

    // Lookup user in database
    const user = (await User.collection.findOne({ email })) as Record<string, unknown> | null;

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          notRegistered: true,
          email,
          message: `No Readapt account found for ${email}. Please ensure you are logging in with the Google account used in the Readapt app.`,
        },
        { status: 404 }
      );
    }

    const isPending = user.deletionStatus === "PENDING_DELETION";
    const now = Date.now();
    const scheduledMs = user.deletionScheduledAt
      ? new Date(user.deletionScheduledAt as string | number | Date).getTime()
      : 0;
    const remainingMs = Math.max(0, scheduledMs - now);

    return NextResponse.json({
      success: true,
      user: {
        _id: String(user._id),
        name: (user.name as string) || name || "Readapt User",
        email: (user.email as string) || email,
        image: (user.image as string) || picture || null,
        deletionStatus: (user.deletionStatus as string) || "ACTIVE",
        scheduledAt: user.deletionScheduledAt
          ? new Date(user.deletionScheduledAt as string | number | Date).toISOString()
          : null,
        token: (user.deletionToken as string) || null,
        remainingMs: isPending ? remainingMs : 0,
      },
    });
  } catch (error) {
    console.error("[Deletion Auth] Server error:", error);
    return NextResponse.json(
      { success: false, message: "An internal server error occurred." },
      { status: 500 }
    );
  }
}
