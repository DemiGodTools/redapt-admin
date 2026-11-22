import { NextResponse } from "next/server";
import { Types } from "mongoose";
import connectMongo from "@/lib/connectMongo";

import { Comment } from "@/models/Comment.model";
import { User } from "@/models/User.model";
import { AddCommentBody } from "@/types/Body";
import { Question } from "@/models/Question.model";
import { Chapter } from "@/models/Chapter.model";

export async function POST(req: Request) {
  try {
    await connectMongo();

    const userEmail = req.headers.get("x-user-email");
    if (!userEmail) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
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

    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
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
      userName: user.name,
      userHandle: user.userId,
      userImage: user.image,
      text: text.trim(),
    });

    // 2️⃣ Push comment into question AND parent chapter qnaComments in parallel
    await Promise.all([
      Question.findByIdAndUpdate(chapterId, { $push: { comments: comment._id } }),
      Chapter.findOneAndUpdate(
        { questions: chapterId },
        { $push: { qnaComments: comment._id } }
      ),
    ]);

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
