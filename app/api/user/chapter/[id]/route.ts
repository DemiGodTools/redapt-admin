// File: app/api/user/chapter/[id]/route.ts
import "@/models/Category.model";
import "@/models/Series.model";
import "@/models/User.model";
import "@/models/Comment.model";
import "@/models/Question.model";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import connectMongo from "@/lib/connectMongo";
import { Chapter } from "@/models/Chapter.model";
import { Comment } from "@/models/Comment.model";
import { Question } from "@/models/Question.model";
import { User } from "@/models/User.model";
import { IS_EARLY_ACCESS_FREE, getVerifiedUserAndEntitlement } from "@/lib/verifyUserEntitlement";
import { normalizeCommentsList, sortCommentsNewestFirst } from "@/lib/commentUtils";

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
      return NextResponse.json({ success: false, message: "Invalid chapter id" }, { status: 400 });
    }

    // ⚡ 1. SECURE: Run auth check, raw questions projection, and chapter populate in parallel
    const chapterObjectId = new Types.ObjectId(id);

    const [authResult, rawChapterDoc, populatedChapter] = await Promise.all([
      getVerifiedUserAndEntitlement(req),
      Chapter.collection.findOne(
        { _id: chapterObjectId },
        { projection: { questions: 1 } }
      ),
      Chapter.findById(id)
        .populate({ path: "category", strictPopulate: false })
        .populate({ path: "subCategory", strictPopulate: false })
        .populate({
          path: "comments",
          strictPopulate: false,
          populate: { path: "by", select: "name userId image imageMd imageSm profileLevel bio profession visibility streakData", strictPopulate: false },
        })
        .populate({
          path: "qnaComments",
          strictPopulate: false,
          populate: { path: "by", select: "name userId image imageMd imageSm profileLevel bio profession visibility streakData", strictPopulate: false },
        })
        .populate({
          path: "series",
          strictPopulate: false,
          populate: {
            path: "chapters.content",
            select: "-lyrics -transcript -toc -questions -comments -qnaComments",
            strictPopulate: false,
          },
        })
        .lean()
        .catch(() => Chapter.findById(id).lean()),
    ]);

    const { user, effectivePlan } = authResult;
    const userPlan = effectivePlan;
    const currentUserId = user?._id ? user._id.toString() : null;
    const userEmail = user?.email || null;
    const chapter: any = populatedChapter;

    if (!chapter) {
      return NextResponse.json({ success: false, message: "Chapter not found" }, { status: 404 });
    }

    // ⚡ Normalize & sort comments newest-first
    if (Array.isArray(chapter.comments)) {
      chapter.comments = sortCommentsNewestFirst(
        normalizeCommentsList(chapter.comments, userEmail, currentUserId)
      );
    }
    if (Array.isArray(chapter.qnaComments)) {
      chapter.qnaComments = sortCommentsNewestFirst(
        normalizeCommentsList(chapter.qnaComments, userEmail, currentUserId)
      );
    }

    // ⚡ 2. REAL-WORLD SECURITY CHECK: Data hiding
    const requiredPlan = Number(chapter.for) || 0;
    if (userPlan < requiredPlan) {
      // Empty the PDF link so bypassers get nothing
      chapter.media = ""; 
    }

    // Ensure lyrics & transcript are always synchronized and available
    const lyricsVal = chapter.lyrics || chapter.transcript || "";
    chapter.transcript = lyricsVal;
    chapter.lyrics = lyricsVal;

    const rawQuestionsList = Array.isArray(rawChapterDoc?.questions) && rawChapterDoc.questions.length > 0
        ? rawChapterDoc.questions
        : Array.isArray(chapter.questions) ? chapter.questions : [];

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
            });
          }
        }

        const rawId = typeof item === "object" && item !== null ? item._id || item.$oid || item.id || item : item;
        const cleanStr = String(rawId).trim();
        if (cleanStr) {
          stringIds.push(cleanStr);
          if (Types.ObjectId.isValid(cleanStr)) { objectIds.push(new Types.ObjectId(cleanStr)); }
        }
      }

      if (stringIds.length > 0) {
        const dbQuestions = await Question.find({
          $or: [ ...(objectIds.length > 0 ? [{ _id: { $in: objectIds } }] : []), { _id: { $in: stringIds as any } } ],
        }).lean();

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
            createdAt: q.createdAt ? new Date(q.createdAt).toISOString() : new Date().toISOString(),
            updatedAt: q.updatedAt ? new Date(q.updatedAt).toISOString() : new Date().toISOString(),
          });
        }
        chapter.questions = stringIds.map((sid) => qMap.get(sid) || embeddedMap.get(sid)).filter(Boolean);
      } else {
        chapter.questions = [];
      }
    } else {
      chapter.questions = [];
    }

    // ⚡ Attach current user's liked status accurately
    let isLiked = false;
    if (user && Array.isArray(user.likes)) {
      const targetStr = String(chapter._id || id);
      isLiked = user.likes.some((lId: any) => {
        const str = typeof lId === "string" ? lId : String(lId?._id || lId?.$oid || "");
        return str === targetStr;
      });
    }
    chapter.isLiked = isLiked;

    return NextResponse.json(
      { success: true, data: chapter },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate", Pragma: "no-cache", Expires: "0" } }
    );
  } catch (err: any) {
    console.error("Get Chapter Error:", err);
    return NextResponse.json({ success: false, message: err?.message || "Server error" }, { status: 500 });
  }
}
