import { logActivity } from "@/lib/activityLogger";
import { NextResponse } from "next/server";
import { Question } from "@/models/Question.model";
import { CreateQuestionBody } from "@/types/Body";
import connectMongo from "@/lib/connectMongo";

export async function POST(req: Request) {
  try {
    await connectMongo();

    const body = (await req.json()) as CreateQuestionBody

    const { question, options, correct, explanation } = body;

    // Basic validation
    if (!question || !options || correct === undefined) {
      return NextResponse.json(
        { success: false, message: "question, options and correct are required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(options) || options.length < 2) {
      return NextResponse.json(
        { success: false, message: "At least 2 options are required" },
        { status: 400 }
      );
    }

    if (correct < 0 || correct >= options.length) {
      return NextResponse.json(
        {
          success: false,
          message: "Correct index must match options length",
        },
        { status: 400 }
      );
    }

    const questionDoc = await Question.create({
      question,
      options,
      correct,
      explanation,
    });

    const adminRole = req.headers.get("x-admin-role") || "admin";
    const adminName = req.headers.get("x-admin-name") || "Master Admin";
    await logActivity({
      action: "QUESTION_ADDED",
      category: "qna",
      title: question.slice(0, 70) + (question.length > 70 ? "..." : ""),
      description: "Question added to interactive quiz bank",
      performedBy: adminName,
      performedByRole: adminRole,
      metadata: { questionId: questionDoc._id.toString() },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      data: questionDoc,
    });
  } catch (err) {
    console.error("Create Question Error:", err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
