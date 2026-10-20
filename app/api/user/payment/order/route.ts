import { SubscriptionPlan } from '@/enums';
import connectMongo from '@/lib/connectMongo';
import { Payment } from '@/models/Payment.model';
import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export const dynamic = 'force-dynamic';

function getRazorpayClient() {
  const key_id = process.env.RAZORPAY_KEY_ID || 'dummy_key';
  const key_secret = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret';
  return new Razorpay({ key_id, key_secret });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, planId, user } = body;

    const razorpay = getRazorpayClient();

    const paymentLink = await razorpay.paymentLink.create({
      amount: Math.round(Number(amount) * 100),
      currency: 'INR',
      accept_partial: false,
      description: `Subscription for ${planId === 1 ? 'Basic' : planId === 2 ? 'Standard' : 'Pro'} Plan`,
      customer: {
        name: user.name,
        email: user.email,
      },
      callback_url: `https://redapt-admin-sand.vercel.app/redirect?userId=${user._id}&planId=${planId}`,
      callback_method: 'get',
    });

    await connectMongo();

   await Payment.create({
      paymentId: paymentLink.id,
      amount: Math.round(Number(amount) * 100),
      status: 'pending',
      byUser: user._id,
      forPlan: planId,
    });

    return NextResponse.json({ url: paymentLink.short_url, id: paymentLink.id });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
