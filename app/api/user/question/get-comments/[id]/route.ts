import { NextResponse } from "next/server";
import { Types } from "mongoose";
import "@/models/Comment.model";
import connectMongo from "@/lib/connectMongo";
import { Question } from "@/models/Question.model";
import {
  COMMENT_USER_PROJECTION,
  normalizeCommentsList,
  sortCommentsNewestFirst,
} from "@/lib/commentUtils";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectMongo();

    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid chapter id" },
        { status: 400 }
      );
    }

    const question = await Question.findById(id)
      .select("comments")
      .populate({
        path: "comments",
        strictPopulate: false,
        populate: {
          path: "by",
          select: COMMENT_USER_PROJECTION,
          strictPopulate: false,
        },
      })
      .lean();

    if (!question) {
      return NextResponse.json(
        { success: false, message: "Question not found" },
        { status: 404 }
      );
    }

    const normalized = sortCommentsNewestFirst(
      normalizeCommentsList((question as any).comments || [])
    );

    const { searchParams } = new URL(req.url);
    const rawLimit = searchParams.get("limit");
    const rawPage = searchParams.get("page");
    const paginate = Boolean(rawLimit || rawPage);
    const limit = Math.min(100, Math.max(1, Number(rawLimit) || 25));
    const page = Math.max(1, Number(rawPage) || 1);
    const data = paginate
      ? normalized.slice((page - 1) * limit, page * limit)
      : normalized;

    return NextResponse.json({
      success: true,
      data,
      total: normalized.length,
      page,
      hasMore: paginate ? page * limit < normalized.length : false,
    });
  } catch (err) {
    console.error("Get Question Error:", err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
