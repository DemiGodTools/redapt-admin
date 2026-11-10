// File: app/api/user/chapter/comment/add/route.ts
import { NextResponse } from "next/server";
import { Types } from "mongoose";
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

export async function POST(req: Request) {
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
