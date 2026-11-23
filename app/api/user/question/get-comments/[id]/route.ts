import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { Comment } from "@/models/Comment.model";
import connectMongo from "@/lib/connectMongo";
import { Question } from "@/models/Question.model";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectMongo();

    const { id } = await params;

    const _ = Comment;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid chapter id" },
        { status: 400 },
      );
    }

    const comments = await Question.findById(id)
     .populate({
        path: "comments",
        populate: {
          path: "by",
          select: "name userId image imageMd imageSm profileLevel bio profession visibility streakData",
        },
      })
      .lean();

    if (!comments) {
      return NextResponse.json(
        { success: false, message: "Question not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: comments.comments,
    });
  } catch (err) {
    console.error("Get Question Error:", err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 },
    );
  }
}
