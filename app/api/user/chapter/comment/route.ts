// File: app/api/user/chapter/comment/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose, { Types } from "mongoose";
import connectMongo from "@/lib/connectMongo";
import { Comment } from "@/models/Comment.model";
import { Chapter } from "@/models/Chapter.model";
import { Question } from "@/models/Question.model";
import { getVerifiedUserAndEntitlement } from "@/lib/verifyUserEntitlement";

// In-memory sliding window rate limiter: max 20 comments per 30 seconds per user
const rateLimitMap = new Map<string, number[]>();
function checkRateLimit(key: string, limit = 20, windowMs = 30000): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(key) || [];
  const validTimestamps = timestamps.filter((t) => now - t < windowMs);
  if (validTimestamps.length >= limit) {
    return false;
  }
  validTimestamps.push(now);
  rateLimitMap.set(key, validTimestamps);
  return true;
}

// Lightweight read endpoint used by the comment drawer. The old client fetched
// the whole chapter document (media, lyrics, questions, series, ...) just to
// display its comments, which was the slowest part of opening the sheet.
export async function GET(req: NextRequest) {
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
      select: "name userId image imageMd imageSm profileLevel",
      strictPopulate: false,
    };

    let comments: any[] | null = null;

    if (isQna) {
      const chapter = await Chapter.findById(chapterId)
        .select("qnaComments")
        .populate({ path: "qnaComments", populate: byPopulate, strictPopulate: false })
        .lean();
      if (chapter) comments = (chapter as any).qnaComments || [];
    } else {
      const chapter = await Chapter.findById(chapterId)
        .select("comments")
        .populate({ path: "comments", populate: byPopulate, strictPopulate: false })
        .lean();
      if (chapter) comments = (chapter as any).comments || [];
    }

    // Q&A comments can also live on a Question document.
    if (comments === null) {
      const question = await Question.findById(chapterId)
        .select("comments")
        .populate({ path: "comments", populate: byPopulate, strictPopulate: false })
        .lean();
      if (question) comments = (question as any).comments || [];
    }

    if (comments === null) {
      return NextResponse.json(
        { success: false, message: "Content not found" },
        { status: 404 }
      );
    }

    const validComments = comments.filter(
      (c: any) => c && c._id && typeof c.text === "string"
    );

    return NextResponse.json(
      { success: true, data: validComments, comments: validComments },
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

export async function POST(req: NextRequest) {
  try {
    await connectMongo();

    const { user } = await getVerifiedUserAndEntitlement(req);

    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized: Please log in to comment" }, { status: 401 });
    }

    // Rate limit check
    if (!checkRateLimit(user._id.toString(), 20, 30000)) {
      return NextResponse.json(
        {
          success: false,
          message: "You are posting comments too fast. Please slow down.",
        },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { chapterId, text, isQna } = body;

    if (!chapterId || !text?.trim() || !Types.ObjectId.isValid(chapterId)) {
      return NextResponse.json({ success: false, message: "Invalid comment data" }, { status: 400 });
    }

    const trimmedText = text.trim();
    if (trimmedText.length > 500) {
      return NextResponse.json(
        { success: false, message: "Comment exceeds maximum limit of 500 characters" },
        { status: 400 }
      );
    }

    const commentId = new Types.ObjectId();
    const updateField = isQna ? "qnaComments" : "comments";

    // ⚡ Concurrent execution: Create Comment and update Chapter in a single parallel round-trip
    const [comment, updatedChapter] = await Promise.all([
      Comment.create({
        _id: commentId,
        by: user._id,
        userEmail: user.email,
        userName: user.name,
        userHandle: user.userId,
        userImage: user.image,
        text: trimmedText,
      }),
      Chapter.findByIdAndUpdate(
        chapterId,
        { $push: { [updateField]: commentId } },
        { select: { _id: 1 }, lean: true }
      ),
    ]);

    // If chapter wasn't found, try Question target
    if (!updatedChapter) {
      const updatedQuestion = await Question.findByIdAndUpdate(
        chapterId,
        { $push: { comments: commentId } },
        { select: { _id: 1 }, lean: true }
      );
      if (!updatedQuestion) {
        // Rollback created comment if target doesn't exist
        await Comment.findByIdAndDelete(commentId).catch(() => {});
        return NextResponse.json({ success: false, message: "Content not found" }, { status: 404 });
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
      text: trimmedText,
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
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectMongo();

    const { user } = await getVerifiedUserAndEntitlement(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
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

    // Gracefully handle in-flight temporary comments
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

    // Check ownership: via user ID or matching user email
    const isOwner =
      (comment.by && comment.by.toString() === user._id.toString()) ||
      (comment.userEmail && user.email && comment.userEmail.toLowerCase() === user.email.toLowerCase());

    if (!isOwner) {
      return NextResponse.json(
        { success: false, message: "You can only delete your own comment" },
        { status: 403 }
      );
    }

    const commentObjectId = comment._id;

    if (chapterId && mongoose.Types.ObjectId.isValid(chapterId)) {
      await Promise.allSettled([
        Chapter.findByIdAndUpdate(chapterId, {
          $pull: { comments: commentObjectId, qnaComments: commentObjectId },
        }),
        Question.findByIdAndUpdate(chapterId, {
          $pull: { comments: commentObjectId },
        }),
      ]);
    }

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
