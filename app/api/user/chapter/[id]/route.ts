// File: app/api/user/chapter/[id]/route.ts
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

    const chapterObjectId = new Types.ObjectId(id);

    // 1. Raw MongoDB document se questions array pehle hi सुरक्षित nikal lein
    // taaki Mongoose populate ya cached schema ise kabhi empty na kar sake
    const rawChapterDoc = await Chapter.collection.findOne(
      { _id: chapterObjectId },
      { projection: { questions: 1 } }
    );

    // 2. Chapter metadata fetch karein (Yahan .populate("questions") NAHI lagana hai)
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
    } catch {
      chapter = await Chapter.findById(id).lean();
    }

    if (!chapter) {
      return NextResponse.json(
        { success: false, message: "Chapter not found" },
        { status: 404 }
      );
    }

    // 3. Raw questions list ko merge karein
    const rawQuestionsList =
      Array.isArray(rawChapterDoc?.questions) && rawChapterDoc.questions.length > 0
        ? rawChapterDoc.questions
        : Array.isArray(chapter.questions)
        ? chapter.questions
        : [];

    if (rawQuestionsList.length > 0) {
      const stringIds: string[] = [];
      const objectIds: Types.ObjectId[] = [];

      for (const item of rawQuestionsList) {
        if (!item) continue;
        const rawId =
          typeof item === "object" && item !== null
            ? item._id || item.$oid || item.id || item
            : item;
        const cleanStr = String(rawId).trim();
        if (cleanStr) {
          stringIds.push(cleanStr);
          if (Types.ObjectId.isValid(cleanStr)) {
            objectIds.push(new Types.ObjectId(cleanStr));
          }
        }
      }

      if (stringIds.length > 0) {
        // Direct MongoDB collection query: matches both ObjectId and String _id
        const dbQuestions = await Question.collection
          .find({
            $or: [
              ...(objectIds.length > 0 ? [{ _id: { $in: objectIds } }] : []),
              { _id: { $in: stringIds as any } },
            ],
          })
          .toArray();

        const qMap = new Map<string, any>();
        for (const q of dbQuestions) {
          const qIdStr = String(q._id);
          qMap.set(qIdStr, {
            ...q,
            _id: qIdStr,
            question: String(q.question || ""),
            options: Array.isArray(q.options) ? q.options.map(String) : [],
            correct: Number(q.correct ?? 0),
            explanation: q.explanation ? String(q.explanation) : "",
            comments: Array.isArray(q.comments) ? q.comments : [],
          });
        }

        // Preserve exact order of questions in chapter
        chapter.questions = stringIds
          .map((sid) => qMap.get(sid))
          .filter(Boolean);
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