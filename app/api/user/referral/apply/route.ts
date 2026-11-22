import { NextRequest, NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { User } from "@/models/User.model";
import { Referral } from "@/models/Referral.model";
import { jwtVerify } from "jose";
import { checkRateLimit } from "@/lib/rateLimit";
import { logActivity } from "@/lib/activityLogger";

async function getAuthenticatedUserEmail(req: NextRequest): Promise<string | null> {
  let userEmail = req.headers.get("x-user-email");
  if (userEmail) return userEmail;

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
        userEmail = ((payload as any)?.email || (payload as any)?.user?.email || null) as string | null;
      } catch {}
    }
  }
  return userEmail;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown-ip";

    const body = await req.json().catch(() => ({}));
    const { code, isTestMode, deviceId } = body;

    if (isTestMode) {
      return NextResponse.json({
        success: true,
        isTestMode: true,
        message: "Referral applied successfully in test preview mode!",
        referrer: {
          name: "Alex Reader",
          userId: "alexreader",
          image: null,
        },
      });
    }

    const userEmail = await getAuthenticatedUserEmail(req);
    if (!userEmail) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 }
      );
    }

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { success: false, message: "Referral code is required." },
        { status: 400 }
      );
    }

    const cleanCode = code.trim().toUpperCase();

    // Rate limiting: max 10 apply requests per minute per user/IP
    const rateCheck = checkRateLimit(`ref_apply_${userEmail}`, 10, 60);
    if (rateCheck.isRateLimited) {
      return NextResponse.json(
        {
          success: false,
          message: `Too many attempts. Please try again in ${rateCheck.resetSeconds}s.`,
        },
        { status: 429 }
      );
    }

    await connectMongo();

    // 1. Fetch current referee user
    const referee = await User.findOne({ email: userEmail });
    if (!referee) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404 }
      );
    }

    // 2. Check if user already redeemed a referral code
    if (referee.hasRedeemedReferral || referee.referredBy) {
      return NextResponse.json(
        { success: false, message: "You have already applied a referral code." },
        { status: 400 }
      );
    }

    // 3. Find the referrer
    const referrer = await User.findOne({
      referralCode: cleanCode,
      deletionStatus: { $ne: "PENDING_DELETION" },
    });

    if (!referrer) {
      return NextResponse.json(
        { success: false, message: "Invalid referral code. Please check and try again." },
        { status: 404 }
      );
    }

    // 4. Anti-Fraud Validations:
    // Self referral check
    if (referrer._id.toString() === referee._id.toString()) {
      return NextResponse.json(
        { success: false, message: "You cannot use your own referral code." },
        { status: 400 }
      );
    }

    // Circular referral check (A referred B, so B cannot refer A)
    if (referrer.referredBy && referrer.referredBy.toString() === referee._id.toString()) {
      return NextResponse.json(
        { success: false, message: "Mutual circular referrals are not permitted." },
        { status: 400 }
      );
    }

    // 5. Atomic DB operations
    try {
      await Referral.create({
        referrer: referrer._id,
        referee: referee._id,
        codeUsed: cleanCode,
        status: "COMPLETED",
        deviceId: deviceId || null,
        ipAddress: ip,
      });
    } catch (dupError: any) {
      // If unique index on referee triggered
      return NextResponse.json(
        { success: false, message: "A referral has already been recorded for this account." },
        { status: 400 }
      );
    }

    // Update referee
    referee.referredBy = referrer._id;
    referee.hasRedeemedReferral = true;
    await referee.save();

    // Atomically increment referrer counter cache
    await User.updateOne(
      { _id: referrer._id },
      { $inc: { totalReferralsCount: 1 } }
    );

    // Activity log
    logActivity({
      action: "REFERRAL_APPLIED",
      category: "general",
      title: `${referee.name || referee.userId} joined via ${referrer.name || referrer.userId}`,
      description: `Referral code ${cleanCode} applied successfully`,
      performedBy: referee.name || referee.email,
      performedByRole: "user",
      metadata: {
        referrerId: referrer._id.toString(),
        refereeId: referee._id.toString(),
        code: cleanCode,
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Referral code applied successfully!",
      referrer: {
        name: referrer.name,
        userId: referrer.userId,
        image: referrer.image || referrer.imageSm || null,
      },
    });
  } catch (error: any) {
    console.error("Referral apply error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to apply referral code." },
      { status: 500 }
    );
  }
}
