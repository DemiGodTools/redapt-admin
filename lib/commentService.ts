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
  sanitizeCommentText,
  sortCommentsNewestFirst,
} from "@/lib/commentUtils";

function parsePagination(searchParams: URLSearchParams): {
  paginate: boolean;
  page: number;
  limit: number;
} {
  const rawLimit = searchParams.get("limit");
  const rawPage = searchParams.get("page");
  if (!rawLimit && !rawPage) {
    return { paginate: false, page: 1, limit: 0 };
  }
  const limit = Math.min(100, Math.max(1, Number(rawLimit) || 25));
  const page = Math.max(1, Number(rawPage) || 1);
  return { paginate: true, page, limit };
}

export async function handleGetComments(req: NextRequest) {
  try {
    await connectMongo();

    const { searchParams } = new URL(req.url);
    const chapterId = searchParams.get("chapterId");
    const isQna = searchParams.get("qna") === "1";

    if (!chapterId || !Types.ObjectId.isValid(chapterId)) {
      return NextResponse.json(
        { success: false, message: "Invalid chapter id" },
        { status: 400 }
      );
    }

    const byPopulate = {
      path: "by",
      select: COMMENT_USER_PROJECTION,
      strictPopulate: false,
    };

    let rawComments: any[] | null = null;

    if (isQna) {
      const chapter = await Chapter.findById(chapterId)
        .select("qnaComments")
        .populate({ path: "qnaComments", populate: byPopulate, strictPopulate: false })
        .lean();
      if (chapter) rawComments = (chapter as any).qnaComments || [];
    } else {
      const chapter = await Chapter.findById(chapterId)
        .select("comments")
        .populate({ path: "comments", populate: byPopulate, strictPopulate: false })
        .lean();
      if (chapter) rawComments = (chapter as any).comments || [];
    }

    if (rawComments === null) {
      const question = await Question.findById(chapterId)
        .select("comments")
        .populate({ path: "comments", populate: byPopulate, strictPopulate: false })
        .lean();
      if (question) rawComments = (question as any).comments || [];
    }

    if (rawComments === null) {
      return NextResponse.json(
        { success: false, message: "Content not found" },
        { status: 404 }
      );
    }

    const normalized = sortCommentsNewestFirst(normalizeCommentsList(rawComments));
    const total = normalized.length;
    const { paginate, page, limit } = parsePagination(searchParams);

    const pagedComments = paginate
      ? normalized.slice((page - 1) * limit, page * limit)
      : normalized;

    return NextResponse.json(
      {
        success: true,
        data: pagedComments,
        comments: pagedComments,
        total,
        page,
        hasMore: paginate ? page * limit < total : false,
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
    const updateField = isQnaTarget ? "qnaComments" : "comments";

    const pushToChapter = async (filter: any, field: string) => {
      try {
        return await Chapter.findOneAndUpdate(
          filter,
          { $push: { [field]: commentId } },
          { select: { _id: 1 }, lean: true }
        );
      } catch (err: any) {
        if (err?.codeName === "PathNotArray" || err?.message?.includes("must be an array")) {
          return await Chapter.findOneAndUpdate(
            filter,
            { $set: { [field]: [commentId] } },
            { select: { _id: 1 }, lean: true }
          );
        }
        throw err;
      }
    };

    const pushToQuestion = async (qId: any) => {
      try {
        return await Question.findByIdAndUpdate(
          qId,
          { $push: { comments: commentId } },
          { select: { _id: 1 }, lean: true }
        );
      } catch (err: any) {
        if (err?.codeName === "PathNotArray" || err?.message?.includes("must be an array")) {
          return await Question.findByIdAndUpdate(
            qId,
            { $set: { comments: [commentId] } },
            { select: { _id: 1 }, lean: true }
          );
        }
        throw err;
      }
    };

    const [comment, updatedChapter] = await Promise.all([
      Comment.create({
        _id: commentId,
        by: user._id,
        targetId: targetObjectId,
        targetType: isQnaTarget ? "qna" : "chapter",
        userEmail: user.email,
        userName: user.name || "Reader",
        userHandle: user.userId || user.name || "user",
        userImage: user.image || "",
        text: sanitized.text,
      }),
      pushToChapter({ _id: targetObjectId }, updateField),
    ]);

    if (!updatedChapter) {
      const [parentChapter, updatedQuestion] = await Promise.all([
        pushToChapter({ questions: targetObjectId }, "qnaComments"),
        pushToQuestion(targetObjectId),
      ]);
      if (!parentChapter && !updatedQuestion) {
        await Comment.findByIdAndDelete(commentId).catch(() => {});
        return NextResponse.json(
          { success: false, message: "Content not found" },
          { status: 404 }
        );
      }
      if (updatedQuestion) {
        await Comment.updateOne(
          { _id: commentId },
          { $set: { targetType: "question" } }
        ).catch(() => {});
      }
    }

    const populatedComment = {
      _id: commentId.toString(),
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
      createdAt: comment.createdAt || new Date().toISOString(),
      updatedAt: comment.updatedAt || new Date().toISOString(),
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

    if (typeof commentId === "string" && commentId.startsWith("temp_")) {
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

    const comment = await Comment.findById(commentId);
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
    let pulledKnownTarget = false;

    const candidateTargetId =
      chapterId && mongoose.Types.ObjectId.isValid(chapterId)
        ? chapterId
        : comment.targetId?.toString();

    if (candidateTargetId && mongoose.Types.ObjectId.isValid(candidateTargetId)) {
      const [chUpdate, qUpdate] = await Promise.all([
        Chapter.updateOne(
          { _id: candidateTargetId },
          { $pull: { comments: commentObjectId, qnaComments: commentObjectId } }
        ),
        Question.updateOne(
          { _id: candidateTargetId },
          { $pull: { comments: commentObjectId } }
        ),
      ]);
      pulledKnownTarget =
        (chUpdate?.modifiedCount || 0) > 0 || (qUpdate?.modifiedCount || 0) > 0;
    }

    // Only run indexed fallback cleanup when comment reference wasn't already removed from known target
    if (!pulledKnownTarget) {
      await Promise.allSettled([
        Chapter.updateMany(
          { $or: [{ comments: commentObjectId }, { qnaComments: commentObjectId }] },
          { $pull: { comments: commentObjectId, qnaComments: commentObjectId } }
        ),
        Question.updateMany(
          { comments: commentObjectId },
          { $pull: { comments: commentObjectId } }
        ),
      ]);
    }

    await Comment.findByIdAndDelete(commentObjectId);

    return NextResponse.json({
      success: true,
      message: "Comment removed successfully",
      commentId: commentObjectId.toString(),
    });
  } catch (error) {
    console.error("DELETE COMMENT ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
