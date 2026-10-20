import { NextResponse } from "next/server";
import { Types } from "mongoose";
import connectMongo from "@/lib/connectMongo";
import { Chapter } from "@/models/Chapter.model";
import { Question } from "@/models/Question.model";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ chapterId: string }> }
) {
  try {
    await connectMongo();
    const { chapterId } = await params;

    if (!Types.ObjectId.isValid(chapterId)) {
      return NextResponse.json(
        { success: false, message: "Invalid chapter id", data: [] },
        { status: 400 }
      );
    }

    const chapterObjectId = new Types.ObjectId(chapterId);

    const rawChapterDoc = await Chapter.collection.findOne(
      { _id: chapterObjectId },
      { projection: { questions: 1, title: 1 } }
    );

    const rawQuestions = Array.isArray(rawChapterDoc?.questions)
      ? rawChapterDoc.questions
      : [];

    if (rawQuestions.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        total: 0,
      });
    }

    const stringIds: string[] = [];
    const objectIds: Types.ObjectId[] = [];
    const embeddedMap = new Map<string, any>();

    for (const item of rawQuestions) {
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

    const finalQuestions = stringIds
      .map((sid) => qMap.get(sid) || embeddedMap.get(sid))
      .filter(Boolean);

    return NextResponse.json({
      success: true,
      data: finalQuestions,
      total: finalQuestions.length,
    });
  } catch (error: any) {
    console.error("Fetch Chapter Questions Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Server error", data: [] },
      { status: 500 }
    );
  }
}
