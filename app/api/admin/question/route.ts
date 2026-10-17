import { NextRequest, NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { Question } from "@/models/Question.model";

// ⚡ Compulsory for Next.js 16 Turbopack
export const dynamic = "force-dynamic";
export const revalidate = 0;

// 1. GET: Fetch all questions
export async function GET() {
  try {
    await connectMongo();
    const questions = await Question.find({})
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(
      { success: true, data: questions },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to fetch questions" },
      { status: 500 }
    );
  }
}

// 2. POST: Create a new question
export async function POST(req: NextRequest) {
  try {
    await connectMongo();
    const body = await req.json();

    const { question, options, correct, explanation } = body;

    if (!question || !options || !Array.isArray(options) || options.length < 2) {
      return NextResponse.json(
        { success: false, message: "Question text and options are required" },
        { status: 400 }
      );
    }

    const newQuestion = await Question.create({
      question: question.trim(),
      options: options.map((opt: string) => opt.trim()),
      correct: Number(correct) || 0,
      explanation: (explanation || "").trim(),
      comments: [],
    });

    return NextResponse.json({
      success: true,
      message: "Question created successfully",
      data: newQuestion,
    });
  } catch (error: any) {
    console.error("Create Question Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to create question" },
      { status: 500 }
    );
  }
}

// 3. PUT: Update an existing question
export async function PUT(req: NextRequest) {
  try {
    await connectMongo();
    const body = await req.json();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id") || body.id;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Question ID is required" },
        { status: 400 }
      );
    }

    const { question, options, correct, explanation } = body;

    const updated = await Question.findByIdAndUpdate(
      id,
      {
        $set: {
          question: question?.trim(),
          options: Array.isArray(options)
            ? options.map((opt: string) => opt.trim())
            : undefined,
          correct: Number(correct) ?? 0,
          explanation: (explanation || "").trim(),
        },
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Question not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Question updated successfully",
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to update question" },
      { status: 500 }
    );
  }
}

// 4. DELETE: Delete a question by ID
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