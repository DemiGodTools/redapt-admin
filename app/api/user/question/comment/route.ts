import { NextResponse } from "next/server";
import { Types } from "mongoose";
import connectMongo from "@/lib/connectMongo";

import { Comment } from "@/models/Comment.model";
import { User } from "@/models/User.model";
import { AddCommentBody } from "@/types/Body";
import { Question } from "@/models/Question.model";
import { Chapter } from "@/models/Chapter.model";
import { getVerifiedUserAndEntitlement } from "@/lib/verifyUserEntitlement";

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

    const body = (await req.json()) as AddCommentBody;
    const { chapterId, text } = body;

    if (!chapterId || !text?.trim()) {
      return NextResponse.json(
        { success: false, message: "chapterId and text are required" },
        { status: 400 }
      );
    }

    if (!Types.ObjectId.isValid(chapterId)) {
      return NextResponse.json(
        { success: false, message: "Invalid chapterId" },
        { status: 400 }
      );
    }

    const question = await Question.findById(chapterId);
    if (!question) {
      return NextResponse.json(
        { success: false, message: "question not found" },
        { status: 404 }
      );
    }

    // 1️⃣ Create comment
    const comment = await Comment.create({
      by: user._id,
      userEmail: user.email,
      userName: user.name || "Reader",
      userHandle: user.userId || user.name || "user",
      userImage: user.image || "",
      text: text.trim(),
    });

    // 2️⃣ Push comment safely into question AND parent chapter qnaComments in parallel
    const pushToQuestion = async () => {
      try {
        await Question.findByIdAndUpdate(chapterId, { $push: { comments: comment._id } });
      } catch (err: any) {
        if (err?.codeName === "PathNotArray" || err?.message?.includes("must be an array")) {
          await Question.findByIdAndUpdate(chapterId, { $set: { comments: [comment._id] } });
        }
      }
    };

    const pushToChapter = async () => {
      try {
        await Chapter.findOneAndUpdate(
          { questions: chapterId },
          { $push: { qnaComments: comment._id } }
        );
      } catch (err: any) {
        if (err?.codeName === "PathNotArray" || err?.message?.includes("must be an array")) {
          await Chapter.findOneAndUpdate(
            { questions: chapterId },
            { $set: { qnaComments: [comment._id] } }
          );
        }
      }
    };

    await Promise.all([pushToQuestion(), pushToChapter()]);

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
      text: text.trim(),
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
