// File: app/api/user/chapter/[id]/route.ts
import "@/models/Category.model";
import "@/models/Series.model";
import "@/models/User.model";
import "@/models/Thought.model";
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

    // 1. Safe Chapter Fetch: Agar populate fail bhi ho toh fallback raw chapter le aayega (Zero 500 Crash)
    let chapter: any = null;
    try {
      chapter = await Chapter.findById(id)
        .populate({ path: "category", strictPopulate: false })
        .populate({ path: "subCategory", strictPopulate: false })
        .populate({
          path: "comments",
          strictPopulate: false,
          populate: {
            path: "by",
            select: "name userId image profileLevel",
            strictPopulate: false,
          },
        })
        .populate({
          path: "series",
          strictPopulate: false,
          populate: {
            path: "chapters.content",
            strictPopulate: false,
          },
        })
        .lean();
    } catch (populateErr) {
      console.warn("Populate fallback triggered for chapter:", id, populateErr);
      chapter = await Chapter.findById(id).lean();
    }

    if (!chapter) {
      return NextResponse.json(
        { success: false, message: "Chapter not found" },
        { status: 404 }
      );
    }

    // 2. Direct DB Query: Real questions fetch karke bind karein
    const rawQuestions = Array.isArray(chapter.questions) ? chapter.questions : [];

    if (rawQuestions.length > 0) {
      // Agar pehle se full question objects hain toh unhe rakh lein, warna ObjectIds extract karein
      const objectIds: Types.ObjectId[] = [];
      const alreadyPopulated: any[] = [];

      for (const item of rawQuestions) {
        if (!item) continue;
        if (
          typeof item === "object" &&
          typeof item.question === "string" &&
          Array.isArray(item.options)
        ) {
          alreadyPopulated.push({
            ...item,
            _id: String(item._id),
            correct: Number(item.correct ?? 0),
            explanation: item.explanation || "",
          });
        } else {
          const rawId =
            typeof item === "object" && item !== null
              ? item._id || item.$oid || item.content || item
              : item;
          const idStr = String(rawId).trim();
          if (Types.ObjectId.isValid(idStr)) {
            objectIds.push(new Types.ObjectId(idStr));
          }
        }
      }

      if (objectIds.length > 0) {
        const dbQuestions = await Question.find({
          _id: { $in: objectIds },
        }).lean();

        // Maintain order and normalize fields for React Native
        const questionMap = new Map<string, any>();
        dbQuestions.forEach((q: any) => {
          questionMap.set(String(q._id), {
            ...q,
            _id: String(q._id),
            question: String(q.question || ""),
            options: Array.isArray(q.options) ? q.options.map(String) : [],
            correct: Number(q.correct ?? 0),
            explanation: q.explanation ? String(q.explanation) : "",
            comments: Array.isArray(q.comments) ? q.comments : [],
          });
        });

        const orderedQuestions = objectIds
          .map((oid) => questionMap.get(String(oid)))
          .filter(Boolean);

        chapter.questions = [...alreadyPopulated, ...orderedQuestions];
      } else {
        chapter.questions = alreadyPopulated;
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