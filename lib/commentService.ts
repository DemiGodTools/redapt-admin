import mongoose, { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { Chapter } from "@/models/Chapter.model";
import { Comment } from "@/models/Comment.model";
import { Question } from "@/models/Question.model";
import { checkRateLimit } from "@/lib/userAuth";
import { getVerifiedUserAndEntitlement } from "@/lib/verifyUserEntitlement";
import {
  COMMENT_USER_PROJECTION,
  normalizeCommentsList,
  sortCommentsNewestFirst,
  sanitizeCommentText,
} from "@/lib/commentUtils";

function parseLimit(searchParams: URLSearchParams, defaultLimit = 25): number {
  const rawLimit = searchParams.get("limit");
  if (!rawLimit) return defaultLimit;
  return Math.min(50, Math.max(1, Number(rawLimit) || defaultLimit));
}

function getLegacyCommentIds(doc: any, isQna: boolean): Types.ObjectId[] {
  const raw = isQna ? doc?.qnaComments : doc?.comments;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((id: any) => {
      const str = typeof id === "string" ? id : String(id?._id || id || "");
      return Types.ObjectId.isValid(str) ? new Types.ObjectId(str) : null;
    })
    .filter((id): id is Types.ObjectId => Boolean(id));
}

/**
 * Million-scale O(limit) comment reader using indexed cursor pagination on Comment
 * plus a bounded O(limit) fallback slice for pre-migration legacy embedded ID arrays.
 */
export async function handleGetComments(req: NextRequest) {
  try {
    await connectMongo();

    const { searchParams } = new URL(req.url);
    const chapterId = searchParams.get("chapterId");
    const isQna = searchParams.get("qna") === "1";
    const cursor = searchParams.get("cursor");
    const rawPage = searchParams.get("page");
    const limit = parseLimit(searchParams, 25);

    if (!chapterId || !Types.ObjectId.isValid(chapterId)) {
      return NextResponse.json(
        { success: false, message: "Invalid chapter id" },
        { status: 400 }
      );
    }

    const targetObjectId = new Types.ObjectId(chapterId);
    const cursorObjId =
      cursor && Types.ObjectId.isValid(cursor) ? new Types.ObjectId(cursor) : null;

    // 1. Identify target document & lightweight counts/legacy IDs (without full .populate!)
    let targetDoc: any = await Chapter.findById(targetObjectId)
      .select("comments qnaComments commentsCount qnaCommentsCount")
      .lean();
    let targetType: "chapter" | "qna" | "question" = isQna ? "qna" : "chapter";

    if (!targetDoc) {
      targetDoc = await Question.findById(targetObjectId)
        .select("comments commentsCount")
        .lean();
      targetType = "question";
    }

    if (!targetDoc) {
      return NextResponse.json(
        { success: false, message: "Content not found" },
        { status: 404 }
      );
    }

    const legacyIds = getLegacyCommentIds(targetDoc, targetType === "qna");
    const storedCount =
      targetType === "qna"
        ? Number(targetDoc.qnaCommentsCount) || 0
        : Number(targetDoc.commentsCount) || 0;
    const total = Math.max(storedCount, legacyIds.length);

    // Offset fallback ONLY when a legacy client passes page > 1 without cursor
    const pageNum = Math.max(1, Number(rawPage) || 1);
    const skip = !cursorObjId && pageNum > 1 ? (pageNum - 1) * limit : 0;

    // 2. Indexed O(limit) cursor query on Comment collection
    const indexedFilter: any = { targetId: targetObjectId, targetType };
    if (cursorObjId) {
      indexedFilter._id = { $lt: cursorObjId };
    }

    let docs: any[] = await Comment.find(indexedFilter)
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit + 1)
      .populate({
        path: "by",
        select: COMMENT_USER_PROJECTION,
        strictPopulate: false,
      })
      .lean();

    const hasMoreIndexed = docs.length > limit;
    if (hasMoreIndexed) {
      docs = docs.slice(0, limit);
    }

    // 3. Bridge: if indexed results didn't fill the page, fill remainder from bounded legacy ID slice
    let hasMoreLegacy = false;
    if (docs.length < limit && legacyIds.length > 0) {
      const seenIds = new Set(docs.map((d) => String(d._id)));
      const reversedLegacy = [...legacyIds].reverse();
      const filteredLegacy = reversedLegacy.filter((id) => {
        const idStr = String(id);
        if (seenIds.has(idStr)) return false;
        if (cursorObjId && idStr >= cursorObjId.toString()) return false;
        return true;
      });

      const indexedTotalOnTarget =
        skip > 0 ? await Comment.countDocuments({ targetId: targetObjectId, targetType }) : 0;
      const legacyOffset = Math.max(0, skip - indexedTotalOnTarget);
      const needed = limit - docs.length;
      const sliceIds = filteredLegacy.slice(legacyOffset, legacyOffset + needed);
      hasMoreLegacy = filteredLegacy.length > legacyOffset + sliceIds.length;

      if (sliceIds.length > 0) {
        const legacyDocs = await Comment.find({ _id: { $in: sliceIds } })
          .populate({
            path: "by",
            select: COMMENT_USER_PROJECTION,
            strictPopulate: false,
          })
          .lean();
        docs = [...docs, ...sortCommentsNewestFirst(legacyDocs)];
      }
    } else if (!hasMoreIndexed && legacyIds.length > 0 && docs.length === limit) {
      const lastIdStr = String(docs[docs.length - 1]._id);
      hasMoreLegacy = legacyIds.some((id) => String(id) < lastIdStr);
    }

    const normalized = sortCommentsNewestFirst(normalizeCommentsList(docs));
    const hasMore = hasMoreIndexed || hasMoreLegacy;
    const nextCursor =
      hasMore && normalized.length > 0
        ? String(normalized[normalized.length - 1]._id)
        : null;

    return NextResponse.json(
      {
        success: true,
        data: normalized,
        comments: normalized,
        total: Math.max(total, normalized.length),
        page: pageNum,
        nextCursor,
        hasMore,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET COMMENTS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function handlePostComment(req: Request) {
  try {
    await connectMongo();

    const { user } = await getVerifiedUserAndEntitlement(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Please log in to comment" },
        { status: 401 }
      );
    }

    const rate = checkRateLimit(`comment:${user._id.toString()}`, 12, 30_000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: "You are posting comments too fast. Please slow down.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfterSec) },
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { chapterId, text, isQna } = body;
    const rawReqId =
      typeof body?.clientRequestId === "string"
        ? body.clientRequestId.trim().slice(0, 80)
        : "";
    const clientRequestId = rawReqId || undefined;

    if (!chapterId || !Types.ObjectId.isValid(chapterId)) {
      return NextResponse.json(
        { success: false, message: "Invalid comment target" },
        { status: 400 }
      );
    }

    const sanitized = sanitizeCommentText(text);
    if (!sanitized.ok) {
      return NextResponse.json(
        { success: false, message: sanitized.message },
        { status: 400 }
      );
    }

    const commentId = new Types.ObjectId();
    const targetObjectId = new Types.ObjectId(chapterId);
    const isQnaTarget = Boolean(isQna || body.qna === 1 || body.qna === "1");
    const targetType: "chapter" | "qna" | "question" = isQnaTarget ? "qna" : "chapter";
    const countField = isQnaTarget ? "qnaCommentsCount" : "commentsCount";

    // Run Comment.create (with unique clientRequestId index for idempotency) and atomic Chapter $inc in parallel
    let createdDoc: any;
    let updatedChapter: any;
    try {
      [createdDoc, updatedChapter] = await Promise.all([
        Comment.create({
          _id: commentId,
          by: user._id,
          targetId: targetObjectId,
          targetType,
          ...(clientRequestId ? { clientRequestId } : {}),
          userEmail: user.email,
          userName: user.name || "Reader",
          userHandle: user.userId || user.name || "user",
          userImage: user.image || "",
          text: sanitized.text,
        }),
        Chapter.findOneAndUpdate(
          { _id: targetObjectId },
          { $inc: { [countField]: 1 } },
          { projection: { _id: 1 } }
        ).lean(),
      ]);
    } catch (createErr: any) {
      if (createErr?.code === 11000 && clientRequestId) {
        const existing = await Comment.findOne({ by: user._id, clientRequestId }).lean();
        if (existing) {
          const normalizedExisting = normalizeCommentsList(
            [existing],
            user.email,
            user._id.toString()
          )[0];
          return NextResponse.json({
            success: true,
            message: "Comment added successfully",
            data: normalizedExisting,
            comment: normalizedExisting,
          });
        }
      }
      throw createErr;
    }

    if (!updatedChapter) {
      // Target might be a Question ID (or Chapter owning a Question)
      const [parentChapter, existingQuestion] = await Promise.all([
        Chapter.findOneAndUpdate(
          { questions: targetObjectId },
          { $inc: { qnaCommentsCount: 1 } },
          { projection: { _id: 1 } }
        ).lean() as Promise<any>,
        Question.findOneAndUpdate(
          { _id: targetObjectId },
          { $inc: { commentsCount: 1 } },
          { projection: { _id: 1 } }
        ).lean() as Promise<any>,
      ]);

      if (!parentChapter && !existingQuestion) {
        await Comment.findByIdAndDelete(commentId).catch(() => {});
        return NextResponse.json(
          { success: false, message: "Content not found" },
          { status: 404 }
        );
      }

      if (existingQuestion) {
        await Comment.updateOne(
          { _id: commentId },
          { $set: { targetType: "question" } }
        );
      }
    }

    const populatedComment = {
      _id: commentId.toString(),
      ...(clientRequestId ? { clientRequestId } : {}),
      by: {
        _id: user._id,
        name: user.name,
        userId: user.userId,
        image: user.image,
        imageMd: user.imageMd,
        imageSm: user.imageSm,
        profileLevel: user.profileLevel || 1,
      },
      userEmail: user.email,
      userName: user.name,
      userHandle: user.userId,
      userImage: user.image,
      text: sanitized.text,
      createdAt: createdDoc.createdAt || new Date().toISOString(),
      updatedAt: createdDoc.updatedAt || new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: "Comment added successfully",
      data: populatedComment,
      comment: populatedComment,
    });
  } catch (error) {
    console.error("ADD COMMENT ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function handleDeleteComment(req: NextRequest) {
  try {
    await connectMongo();

    const { user } = await getVerifiedUserAndEntitlement(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const rate = checkRateLimit(`comment_del:${user._id.toString()}`, 20, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { success: false, message: "Too many delete requests. Please slow down." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } }
      );
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const { searchParams } = new URL(req.url);
    const commentId = body?.commentId || searchParams.get("commentId");
    const chapterId = body?.chapterId || searchParams.get("chapterId");

    if (!commentId) {
      return NextResponse.json(
        { success: false, message: "Invalid or missing commentId" },
        { status: 400 }
      );
    }

    if (
      typeof commentId === "string" &&
      (commentId.startsWith("temp_") ||
        commentId.startsWith("posting_") ||
        commentId.startsWith("comment_"))
    ) {
      return NextResponse.json({
        success: true,
        message: "Temporary comment acknowledged as removed",
        commentId,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return NextResponse.json(
        { success: false, message: "Invalid commentId format" },
        { status: 400 }
      );
    }

    const comment: any = await Comment.findById(commentId)
      .select("_id by userEmail targetId targetType")
      .lean();
    if (!comment) {
      return NextResponse.json({
        success: true,
        message: "Comment already removed",
      });
    }

    const isOwner =
      (comment.by && comment.by.toString() === user._id.toString()) ||
      (comment.userEmail &&
        user.email &&
        comment.userEmail.toLowerCase() === user.email.toLowerCase());

    if (!isOwner) {
      return NextResponse.json(
        { success: false, message: "You can only delete your own comment" },
        { status: 403 }
      );
    }

    const commentObjectId = comment._id;
    const candidateTargetId =
      comment.targetId?.toString() ||
      (chapterId && mongoose.Types.ObjectId.isValid(chapterId) ? chapterId : null);

    let pulledKnownTarget = false;

    if (candidateTargetId && mongoose.Types.ObjectId.isValid(candidateTargetId)) {
      const targetObj = new Types.ObjectId(candidateTargetId);
      const isQnaComment = comment.targetType === "qna";

      if (comment.targetType === "question") {
        await Question.updateOne(
          { _id: targetObj },
          { $pull: { comments: commentObjectId } }
        );
        await Question.updateOne(
          { _id: targetObj, commentsCount: { $gt: 0 } },
          { $inc: { commentsCount: -1 } }
        );
        pulledKnownTarget = true;
      } else {
        const countKey = isQnaComment ? "qnaCommentsCount" : "commentsCount";
        const [chRes, qRes] = await Promise.all([
          Chapter.updateOne(
            { _id: targetObj },
            { $pull: { comments: commentObjectId, qnaComments: commentObjectId } }
          ),
          Question.updateOne(
            { _id: targetObj },
            { $pull: { comments: commentObjectId } }
          ),
        ]);
        if ((chRes?.matchedCount || 0) > 0) {
          await Chapter.updateOne(
            { _id: targetObj, [countKey]: { $gt: 0 } },
            { $inc: { [countKey]: -1 } }
          );
          pulledKnownTarget = true;
        }
        if ((qRes?.modifiedCount || 0) > 0) {
          await Question.updateOne(
            { _id: targetObj, commentsCount: { $gt: 0 } },
            { $inc: { commentsCount: -1 } }
          );
          pulledKnownTarget = true;
        }
      }
    }

    // Legacy fallback only if comment lacked targetId & didn't match chapterId
    const postDeleteOps: Promise<any>[] = [Comment.findByIdAndDelete(commentObjectId)];
    if (!pulledKnownTarget) {
      postDeleteOps.push(
        Chapter.updateMany(
          { comments: commentObjectId },
          { $pull: { comments: commentObjectId }, $inc: { commentsCount: -1 } }
        ),
        Chapter.updateMany(
          { qnaComments: commentObjectId },
          { $pull: { qnaComments: commentObjectId }, $inc: { qnaCommentsCount: -1 } }
        ),
        Question.updateMany(
          { comments: commentObjectId },
          { $pull: { comments: commentObjectId }, $inc: { commentsCount: -1 } }
        )
      );
    }
    await Promise.allSettled(postDeleteOps);

    return NextResponse.json({
      success: true,
      message: "Comment removed successfully",
      commentId: commentObjectId.toString(),
    });
  } catch (error) {
    console.error("REMOVE/DELETE COMMENT ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
