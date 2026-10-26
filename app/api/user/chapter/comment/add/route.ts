// File: app/api/user/chapter/comment/add/route.ts
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import connectMongo from "@/lib/connectMongo";
import { Comment } from "@/models/Comment.model";
import { Chapter } from "@/models/Chapter.model";
import { getVerifiedUserAndEntitlement } from "@/lib/verifyUserEntitlement";

export async function POST(req: Request) {
  try {
    await connectMongo();

    const { user, effectivePlan, isExpired } = await getVerifiedUserAndEntitlement(req);

    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // ⚡ BLOCK FREE & EXPIRED USERS FROM POSTING COMMENTS
    if (effectivePlan < 1) {
      return NextResponse.json(
        {
          success: false,
          message: isExpired
            ? "Your subscription has expired. Renew to post comments."
            : "Free tier users cannot post comments. Please upgrade your plan.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { chapterId, text, isQna } = body;

    if (!chapterId || !text?.trim() || !Types.ObjectId.isValid(chapterId)) {
      return NextResponse.json({ success: false, message: "Invalid data" }, { status: 400 });
    }

    const chapter = await Chapter.findById(chapterId);
    if (!chapter) {
      return NextResponse.json({ success: false, message: "Chapter not found" }, { status: 404 });
    }

    const comment = await Comment.create({
      by: user._id,
      text: text.trim(),
    });

    if (isQna) {
      chapter.qnaComments = chapter.qnaComments || [];
      chapter.qnaComments.push(comment._id);
    } else {
      chapter.comments = chapter.comments || [];
      chapter.comments.push(comment._id);
    }
    await chapter.save();

    const populatedComment = await Comment.findById(comment._id).populate(
      "by",
      "name userId image profileLevel"
    );

    return NextResponse.json({
      success: true,
      message: "Comment added successfully",
      data: populatedComment,
    });
  } catch (error) {
    console.error("ADD COMMENT ERROR:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}