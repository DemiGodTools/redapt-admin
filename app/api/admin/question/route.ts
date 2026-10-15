import { NextRequest, NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import Question from "@/models/Question.model";

// 1. GET: Fetch all questions
export async function GET() {
  try {
    await connectMongo();
    const questions = await Question.find({})
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: questions });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to fetch questions" },
      { status: 500 }
    );
  }
}

// 2. DELETE: Delete a question by ID
export async function DELETE(req: NextRequest) {
  try {
    await connectMongo();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Question ID required" },
        { status: 400 }
      );
    }

    await Question.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "Question deleted" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to delete question" },
      { status: 500 }
    );
  }
}