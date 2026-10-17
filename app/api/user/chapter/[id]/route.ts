import "@/models/Category.model";
import "@/models/Series.model";
import "@/models/User.model";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import connectMongo from "@/lib/connectMongo";
import { Chapter } from "@/models/Chapter.model";
import { Comment } from "@/models/Comment.model";
import { Question } from "@/models/Question.model";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectMongo();

    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid chapter id" },
        { status: 400 }
      );
    }

    const _ = Comment;
    const __ = Question;

    const chapter: any = await Chapter.findById(id)
      .populate("category")
      .populate("subCategory")
      .populate({
        path: "comments",
        populate: {
          path: "by",
          select: "name userId image profileLevel",
        },
      })
      .populate({
        path: "series",
        populate: {
          path: "chapters.content",
        },
      })
      .lean();

    if (!chapter) {
      return NextResponse.json(
        { success: false, message: "Chapter not found" },
        { status: 404 }
      );
    }

    // ⚡ Direct DB Query: Database se real questions documents bind karein
    if (Array.isArray(chapter.questions) && chapter.questions.length > 0) {
      const qIds = chapter.questions
        .map((q: any) => (typeof q === "object" && q?._id ? q._id : q))
        .filter((qId: any) => Types.ObjectId.isValid(String(qId)));

      if (qIds.length > 0) {
        const dbQuestions = await Question.find({ _id: { $in: qIds } }).lean();
        chapter.questions = dbQuestions;
      } else {
        chapter.questions = [];
      }
    } else {
      chapter.questions = [];
    }

    return NextResponse.json(
      {
        success: true,
        data: chapter,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (err: any) {
    console.error("Get Chapter Error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Server error" },
      { status: 500 }
    );
  }
}