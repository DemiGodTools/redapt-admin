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

    // 1. Raw MongoDB document se questions array nikal lein
    const rawChapterDoc = await Chapter.collection.findOne(
      { _id: chapterObjectId },
      { projection: { questions: 1 } }
    );

    // 2. Chapter metadata fetch karein
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
      const embeddedMap = new Map<string, any>();

      for (const item of rawQuestionsList) {
        if (!item) continue;
        if (typeof item === "object" && (item.question || item.content?.question)) {
          const qObj = item.content || item;
          const qId = String(qObj._id || qObj.id || qObj.$oid || "").trim();
          if (qId) {
            embeddedMap.set(qId, {
              ...qObj,
              _id: qId,
              question: String(qObj.question || "").trim(),
              options: Array.isArray(qObj.options) ? qObj.options.map(String) : [],
              correct: Number(qObj.correct ?? 0),
              explanation: qObj.explanation ? String(qObj.explanation) : "",
              comments: Array.isArray(qObj.comments) ? qObj.comments : [],
            });
          }
        }

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
            question: String(q.question || "").trim(),
            options: Array.isArray(q.options) ? q.options.map(String) : [],
            correct: Number(q.correct ?? 0),
            explanation: q.explanation ? String(q.explanation) : "",
            comments: Array.isArray(q.comments) ? q.comments : [],
            createdAt: q.createdAt ? new Date(q.createdAt).toISOString() : new Date().toISOString(),
            updatedAt: q.updatedAt ? new Date(q.updatedAt).toISOString() : new Date().toISOString(),
          });
        }

        // Preserve exact order of questions in chapter
        chapter.questions = stringIds
          .map((sid) => qMap.get(sid) || embeddedMap.get(sid))
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
