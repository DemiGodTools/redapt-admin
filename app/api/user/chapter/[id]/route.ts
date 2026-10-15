import "@/models/Category.model";
import "@/models/Series.model";
import "@/models/User.model";
import "@/models/Question.model";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { Chapter } from "@/models/Chapter.model";
import { Comment } from "@/models/Comment.model";
import connectMongo from "@/lib/connectMongo";

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
        { status: 400 }
      );
    }

    const chapter = await Chapter.findById(id)
      .populate("category")
      .populate("questions")
      .populate({
        path: "comments",
        populate: {
          path: "by",
          select: "name userId image profileLevel",
        },
      })
      .populate({
        path: "series",
        populate: {
          path: "chapters.content",
        },
      })
      .lean();

    if (!chapter) {
      return NextResponse.json(
        { success: false, message: "Chapter not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: chapter,
    });
  } catch (err) {
    console.error("Get Chapter Error:", err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}