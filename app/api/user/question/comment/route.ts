import { NextResponse } from "next/server";
import { Types } from "mongoose";
import connectMongo from "@/lib/connectMongo";

import { Comment } from "@/models/Comment.model";
import { User } from "@/models/User.model";
import { AddCommentBody } from "@/types/Body";
import { Question } from "@/models/Question.model";
import { Chapter } from "@/models/Chapter.model";
import { getVerifiedUserAndEntitlement } from "@/lib/verifyUserEntitlement";
import { checkRateLimit } from "@/lib/userAuth";
import { sanitizeCommentText } from "@/lib/commentUtils";

export async function POST(req: Request) {
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
        { success: false, message: "You are posting comments too fast. Please slow down." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } }
      );
    }

    const body = (await req.json().catch(() => ({}))) as AddCommentBody;
    const { chapterId, text } = body;

    if (!chapterId || !Types.ObjectId.isValid(chapterId)) {
      return NextResponse.json(
        { success: false, message: "Invalid question id" },
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

    const question: any = await Question.findById(chapterId)
      .select("_id comments commentsCount")
      .lean();
    if (!question) {
      return NextResponse.json(
        { success: false, message: "question not found" },
        { status: 404 }
      );
    }

    // 1️⃣ Create comment with sanitized text and target metadata
    const comment = await Comment.create({
      by: user._id,
      targetId: new Types.ObjectId(chapterId),
      targetType: "question",
      userEmail: user.email,
      userName: user.name || "Reader",
      userHandle: user.userId || user.name || "user",
      userImage: user.image || "",
      text: sanitized.text,
    });

    // 2️⃣ Increment atomic counters without growing unbounded ObjectId arrays
    const prevQCount = Number(question.commentsCount) || 0;
    const prevQLen = Array.isArray(question.comments) ? question.comments.length : 0;
    const updateQuestionCount =
      prevQCount < prevQLen
        ? Question.updateOne({ _id: chapterId }, { $set: { commentsCount: prevQLen + 1 } })
        : Question.updateOne({ _id: chapterId }, { $inc: { commentsCount: 1 } });

    const updateParentChapterCount = Chapter.updateMany(
      { questions: chapterId },
      { $inc: { qnaCommentsCount: 1 } }
    );

    await Promise.all([updateQuestionCount, updateParentChapterCount]);

    const populatedComment = {
      _id: comment._id.toString(),
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
      text: sanitized.text,
      createdAt: comment.createdAt || new Date().toISOString(),
      updatedAt: comment.updatedAt || new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: "Comment added successfully",
      comment: populatedComment,
      data: populatedComment,
    });
  } catch (error) {
    console.error("ADD COMMENT ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
