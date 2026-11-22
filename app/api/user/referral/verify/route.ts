import { NextRequest, NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { User } from "@/models/User.model";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown-ip";
    
    // Rate limit: max 25 code verifications per minute per IP
    const rateCheck = checkRateLimit(`ref_verify_${ip}`, 25, 60);
    if (rateCheck.isRateLimited) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          message: `Too many attempts. Please try again in ${rateCheck.resetSeconds}s.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { code, isTestMode } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { success: false, valid: false, message: "Referral code is required." },
        { status: 400 }
      );
    }

    const cleanCode = code.trim().toUpperCase();

    // Standard format validation: 6-12 characters, alphanumeric only
    if (cleanCode.length < 5 || cleanCode.length > 15 || !/^[A-Z0-9_-]+$/.test(cleanCode)) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          message: "Referral code must be 6-12 alphanumeric characters.",
        },
        { status: 400 }
      );
    }

    // In preview / test mode, allow verification to succeed with simulated referrer info
    if (isTestMode) {
      return NextResponse.json({
        success: true,
        valid: true,
        isTestMode: true,
        referrer: {
          name: "Alex Reader",
          userId: "alexreader",
          image: null,
        },
      });
    }

    await connectMongo();

    const referrer = await User.findOne({
      referralCode: cleanCode,
      deletionStatus: { $ne: "PENDING_DELETION" },
    })
      .select("name userId image imageSm")
      .lean();

    if (!referrer) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          message: "Invalid referral code. Please check and try again.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      valid: true,
      referrer: {
        name: referrer.name || "A fellow reader",
        userId: referrer.userId,
        image: referrer.image || referrer.imageSm || null,
      },
    });
  } catch (error: any) {
    console.error("Referral verify error:", error);
    return NextResponse.json(
      { success: false, valid: false, message: "Error verifying referral code." },
      { status: 500 }
    );
  }
}
