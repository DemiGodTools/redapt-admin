import { NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { Thought } from "@/models/Thought.model";

export async function GET() {
  try {
    await connectMongo();
    const thought = await Thought.findOne({}).sort({ updatedAt: -1 }).lean();
    return NextResponse.json({
      success: true,
      data: thought || null,
    });
  } catch (err: any) {
    console.error("Get User Thought Error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Server error" },
      { status: 500 }
    );
  }
}

