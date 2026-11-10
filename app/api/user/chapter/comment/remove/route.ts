import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectMongo from "@/lib/connectMongo";
import { User } from "@/models/User.model";
import { Comment } from "@/models/Comment.model";
import { Chapter } from "@/models/Chapter.model";
import { Question } from "@/models/Question.model";
import { getVerifiedUserAndEntitlement } from "@/lib/verifyUserEntitlement";

async function handleDeleteComment(req: NextRequest) {
  try {
    await connectMongo();

    // 1️⃣ Authenticate user using JWT or x-user-email fallback
    const { user } = await getVerifiedUserAndEntitlement(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2️⃣ Parse payload from JSON body or URL search params
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
        { success: false, message: "commentId is required" },
        { status: 400 }
      );
    }

    // Gracefully acknowledge in-flight temporary comments
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

    // 3️⃣ Fetch the comment
    const comment = await Comment.findById(commentId);
    if (!comment) {
      // Idempotent: If already removed, return success so UI remains in sync
      return NextResponse.json({
        success: true,
        message: "Comment already removed",
      });
    }

    // 4️⃣ Ownership verification: Users can only delete their own comments (by ID or email)
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

    // 5️⃣ Clean references from Chapter (both comments and qnaComments) & Question
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

    // Also pull globally from any chapter or question to prevent orphaned IDs
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

    // 6️⃣ Delete the comment document permanently
    await Comment.findByIdAndDelete(commentObjectId);

    return NextResponse.json({
      success: true,
      message: "Comment removed successfully",
      commentId: commentObjectId.toString(),
    });
  } catch (error) {
    console.error("REMOVE COMMENT ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return handleDeleteComment(req);
}

export async function DELETE(req: NextRequest) {
  return handleDeleteComment(req);
}
