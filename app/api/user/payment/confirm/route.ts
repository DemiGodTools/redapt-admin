// File: app/api/user/payment/confirm/route.ts
import connectMongo from "@/lib/connectMongo";
import { Payment } from "@/models/Payment.model";
import { User } from "@/models/User.model";
import { NextRequest, NextResponse } from "next/server";
import { normalizeServerTier } from "@/lib/verifyUserEntitlement";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { paymentId, paymentStatus, userId } = body;

    if (!paymentId || !userId) {
      return NextResponse.json(
        { success: false, error: "Missing paymentId or userId" },
        { status: 400 }
      );
    }

    await connectMongo();

    // ⚡ 1. IDEMPOTENCY CHECK: Prevent duplicate webhook/callback from extending expiry twice
    const existingCompleted = await Payment.findOne({
      paymentId,
      status: "completed",
    });
    if (existingCompleted) {
      return NextResponse.json({
        success: true,
        idempotent: true,
        payment: existingCompleted,
      });
    }

    // ⚡ Server-Side Payment Gateway Verification: Verify directly with Razorpay API
    if (paymentStatus === "paid" && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      try {
        const Razorpay = (await import("razorpay")).default;
        const rzp = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID,
          key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
        const paymentRecord: any = await rzp.payments.fetch(paymentId);
        if (!paymentRecord || (paymentRecord.status !== "captured" && paymentRecord.status !== "authorized")) {
          return NextResponse.json(
            { success: false, error: "Payment was not captured by Razorpay gateway" },
            { status: 400 }
          );
        }
      } catch (rzpErr: any) {
        console.error("Razorpay verification failed:", rzpErr);
        return NextResponse.json(
          { success: false, error: "Payment verification failed with gateway" },
          { status: 400 }
        );
      }
    }

    const updatedPayment = await Payment.findOneAndUpdate(
      { byUser: userId, status: "pending" },
      {
        paymentId: paymentId,
        status: paymentStatus === "paid" ? "completed" : "failed",
      },
      { new: true, sort: { createdAt: -1 } }
    );

    if (!updatedPayment) {
      return NextResponse.json(
        { success: false, error: "Pending payment not found" },
        { status: 404 }
      );
    }

    // ⚡ 2. NORMALIZE TIER: 1=Basic (30d), 2=Standard (30d), 3=Pro (40d)
    const assignedPlan = normalizeServerTier(updatedPayment.forPlan);
    const validityDays = assignedPlan >= 3 ? 40 : 30;
    const expiresOn = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000);

    if (paymentStatus === "paid" && assignedPlan > 0) {
      const user = await User.findById(userId);
      if (user) {
        user.subscription = {
          plan: assignedPlan,
          expiresOn,
        };
        await user.save();
      }
    }

    return NextResponse.json({
      success: true,
      payment: updatedPayment,
    });
  } catch (err: any) {
    console.error("Confirm Error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Confirmation failed" },
      { status: 500 }
    );
  }
}