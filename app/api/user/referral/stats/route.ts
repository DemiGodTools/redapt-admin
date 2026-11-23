import { NextRequest, NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { User } from "@/models/User.model";
import { Referral } from "@/models/Referral.model";
import { jwtVerify } from "jose";
import { ensureUserReferralCode } from "@/lib/referralHelper";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface AuthIdentifier {
  email?: string | null;
  userId?: string | null;
}

async function getAuthenticatedUser(req: NextRequest): Promise<AuthIdentifier> {
  let userEmail = req.headers.get("x-user-email");
  let userId = req.headers.get("x-user-id");

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (token && token !== "undefined" && token !== "null") {
      try {
        const rawSecret =
          process.env.JWT_SECRET ||
          process.env.NEXTAUTH_SECRET ||
          "readapt_super_secret_jwt_key_12345";
        const secret = new TextEncoder().encode(rawSecret.trim());
        const { payload } = await jwtVerify(token, secret);
        const p: any = payload;
        if (!userEmail) {
          userEmail = (p?.email || p?.user?.email || null) as string | null;
        }
        if (!userId) {
          userId = (p?._id || p?.userId || p?.user?._id || p?.user?.userId || null) as string | null;
        }
      } catch {}
    }
  }
  return { email: userEmail, userId };
}

export async function GET(req: NextRequest) {
  try {
    const { email: userEmail, userId } = await getAuthenticatedUser(req);
    if (!userEmail && !userId) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 }
      );
    }

    await connectMongo();

    const lookupQueries: any[] = [];
    if (userEmail) {
      lookupQueries.push({ email: userEmail.trim().toLowerCase() });
      lookupQueries.push({ email: userEmail.trim() });
    }
    if (userId) {
      lookupQueries.push({ userId: userId.toString().trim() });
      try {
        lookupQueries.push({ _id: userId });
      } catch {}
    }

    const user = await User.findOne({ $or: lookupQueries });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404 }
      );
    }

    // Guarantee the user has a permanent referral code
    const referralCode = await ensureUserReferralCode(user);

    // Efficient lookup of referred friends (paginated / limited to top 50)
    const referralDocs = await Referral.find({ referrer: user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("referee", "name userId image imageSm imageMd profilePhoto createdAt")
      .lean();

    const referralsList = referralDocs
      .filter((ref: any) => Boolean(ref.referee))
      .map((ref: any) => ({
        id: ref._id.toString(),
        name: ref.referee.name || "Reader",
        userId: ref.referee.userId || "",
        image:
          ref.referee.image ||
          ref.referee.imageSm ||
          ref.referee.imageMd ||
          ref.referee.profilePhoto ||
          null,
        joinedAt: ref.createdAt,
      }));

    return NextResponse.json(
      {
        success: true,
        referralCode,
        totalCount: user.totalReferralsCount || referralsList.length,
        referrals: referralsList,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error: any) {
    console.error("Referral stats error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch referral stats." },
      { status: 500 }
    );
  }
}
