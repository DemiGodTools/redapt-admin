import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import connectMongo from "@/lib/connectMongo";
import { Chapter } from "@/models/Chapter.model";
import "@/models/Category.model";
import "@/models/Question.model";
import "@/models/Series.model";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// 1. GET: Fetch all chapters with populated category & question counts
export async function GET() {
  try {
    await connectMongo();
    const chapters = await Chapter.find({})
      .populate("category", "name")
      .populate("subCategory", "name")
      .populate("series", "title")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(
      { success: true, data: chapters },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to fetch chapters" },
      { status: 500 }
    );
  }
}

// 2. POST: Create a new chapter
export async function POST(req: NextRequest) {
  try {
    await connectMongo();
    const body = await req.json();

    const {
      title,
      details,
      media,
      cover,
      author,
      type = "pdf",
      for: subscriptionPlan = 0,
      category,
      subCategory,
      series,
      isTrending = false,
      isDownloadable = true,
      toc = [],
    } = body;

    if (!title?.trim() || !details?.trim() || !media?.trim() || !cover?.trim() || !author?.trim() || !category) {
      return NextResponse.json(
        { success: false, message: "Title, details, media URL, cover URL, author, and category are required." },
        { status: 400 }
      );
    }

    if (!Types.ObjectId.isValid(category)) {
      return NextResponse.json(
        { success: false, message: "Invalid category ID." },
        { status: 400 }
      );
    }

    const newChapter = await Chapter.create({
      title: title.trim(),
      details: details.trim(),
      media: media.trim(),
      cover: cover.trim(),
      author: author.trim(),
      type: type === "audio" ? "audio" : "pdf",
      for: Number(subscriptionPlan) || 0,
      category: new Types.ObjectId(category),
      subCategory: subCategory && Types.ObjectId.isValid(subCategory) ? new Types.ObjectId(subCategory) : null,
      series: series && Types.ObjectId.isValid(series) ? new Types.ObjectId(series) : null,
      isTrending: Boolean(isTrending),
      isDownloadable: Boolean(isDownloadable),
      toc: Array.isArray(toc) ? toc.filter((t: any) => t.title?.trim() && t.cut?.trim()) : [],
      questions: [],
      comments: [],
      likes: 0,
    });

    return NextResponse.json({
      success: true,
      message: "Chapter created successfully!",
      data: newChapter,
    });
  } catch (error: any) {
    console.error("Create Chapter Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to create chapter" },
      { status: 500 }
    );
  }
}

// 3. PUT: Update an existing chapter
export async function PUT(req: NextRequest) {
  try {
    await connectMongo();
    const body = await req.json();
    const { searchParams } = new URL(req.url);
    const chapterId = searchParams.get("id") || body.id || body._id;

    if (!chapterId || !Types.ObjectId.isValid(chapterId)) {
      return NextResponse.json(
        { success: false, message: "Valid Chapter ID is required" },
        { status: 400 }
      );
    }

    // Support direct question assignment agar sirf questions update ho rahe hon
    if (body.questions && Array.isArray(body.questions) && Object.keys(body).length <= 2) {
      const validQIds = body.questions
        .filter((qId: any) => typeof qId === "string" && Types.ObjectId.isValid(qId))
        .map((qId: string) => new Types.ObjectId(qId));

      const updated = await Chapter.findByIdAndUpdate(
        chapterId,
        { $set: { questions: validQIds } },
        { new: true }
      ).populate("questions").lean();

      return NextResponse.json({ success: true, message: "Questions updated", data: updated });
    }

    const updateFields: any = {};
    if (body.title !== undefined) updateFields.title = body.title.trim();
    if (body.details !== undefined) updateFields.details = body.details.trim();
    if (body.media !== undefined) updateFields.media = body.media.trim();
    if (body.cover !== undefined) updateFields.cover = body.cover.trim();
    if (body.author !== undefined) updateFields.author = body.author.trim();
    if (body.type !== undefined) updateFields.type = body.type;
    if (body.for !== undefined) updateFields.for = Number(body.for);
    if (body.isTrending !== undefined) updateFields.isTrending = Boolean(body.isTrending);
    if (body.isDownloadable !== undefined) updateFields.isDownloadable = Boolean(body.isDownloadable);

    if (body.category && Types.ObjectId.isValid(body.category)) {
      updateFields.category = new Types.ObjectId(body.category);
    }
    if (body.subCategory !== undefined) {
      updateFields.subCategory = body.subCategory && Types.ObjectId.isValid(body.subCategory) ? new Types.ObjectId(body.subCategory) : null;
    }
    if (body.series !== undefined) {
      updateFields.series = body.series && Types.ObjectId.isValid(body.series) ? new Types.ObjectId(body.series) : null;
    }
    if (Array.isArray(body.toc)) {
      updateFields.toc = body.toc.filter((t: any) => t.title?.trim() && t.cut?.trim());
    }

    const updatedChapter = await Chapter.findByIdAndUpdate(
      chapterId,
      { $set: updateFields },
      { new: true }
    )
      .populate("category", "name")
      .populate("subCategory", "name")
      .lean();

    if (!updatedChapter) {
      return NextResponse.json({ success: false, message: "Chapter not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Chapter updated successfully!",
      data: updatedChapter,
    });
  } catch (error: any) {
    console.error("Update Chapter Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to update chapter" },
      { status: 500 }
    );
  }
}

// 4. DELETE: Delete chapter by ID
export async function DELETE(req: NextRequest) {
  try {
    await connectMongo();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id || !Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Valid Chapter ID required" }, { status: 400 });
    }

    await Chapter.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "Chapter deleted successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to delete chapter" },
      { status: 500 }
    );
  }
}