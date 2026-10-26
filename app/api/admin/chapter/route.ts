// File: app/api/admin/chapter/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import connectMongo from "@/lib/connectMongo";
import { Chapter } from "@/models/Chapter.model";
import "@/models/Category.model";
import "@/models/Question.model";
import { Series } from "@/models/Series.model";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// 1. GET: Fetch all chapters AND all series together
export async function GET() {
  try {
    await connectMongo();
    const [chapters, allSeries] = await Promise.all([
      Chapter.find({})
        .populate("category", "name")
        .populate("subCategory", "name")
        .populate("series", "title")
        .sort({ createdAt: -1 })
        .lean(),
      Series.find({})
        .select("_id title type chapters category for")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    return NextResponse.json(
      { success: true, data: chapters, series: allSeries },
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
      isProtected = true,
      toc = [],
      transcript = "", // ⚡ Naya transcript field
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

    const validSeriesId = series && Types.ObjectId.isValid(series) ? new Types.ObjectId(series) : null;

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
      series: validSeriesId,
      isTrending: Boolean(isTrending),
      isDownloadable: Boolean(isDownloadable),
      isProtected: Boolean(isProtected),
      toc: Array.isArray(toc) ? toc.filter((t: any) => t.title?.trim() && t.cut?.trim()) : [],
      transcript: type === "audio" ? transcript.trim() : "", // ⚡ Save Transcript sirf Audio ke liye
      questions: [],
      comments: [],
      likes: 0,
    });

    // Sync with Series.chapters array if a series was selected
    if (validSeriesId) {
      const seriesDoc = await Series.findById(validSeriesId);
      if (seriesDoc) {
        const alreadyExists = seriesDoc.chapters?.some(
          (item: any) => String(item.content) === String(newChapter._id)
        );
        if (!alreadyExists) {
          const nextOrder = seriesDoc.chapters?.length
            ? Math.max(...seriesDoc.chapters.map((c: any) => c.order || 0)) + 1
            : 1;
          seriesDoc.chapters.push({
            content: newChapter._id,
            contentModel: "Chapter",
            order: nextOrder,
          });
          await seriesDoc.save();
        }
      }
    }

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
    if (body.isProtected !== undefined) updateFields.isProtected = Boolean(body.isProtected);

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
    
    // ⚡ Update Transcript logic
    if (body.transcript !== undefined) {
      updateFields.transcript = body.type === "audio" ? body.transcript.trim() : "";
    }

    const updatedChapter = await Chapter.findByIdAndUpdate(
      chapterId,
      { $set: updateFields },
      { new: true }
    )
      .populate("category", "name")
      .populate("subCategory", "name")
      .populate("series", "title")
      .lean();

    if (!updatedChapter) {
      return NextResponse.json({ success: false, message: "Chapter not found" }, { status: 404 });
    }

    // Bidirectional Series Sync when series is changed in Edit Modal
    if (body.series !== undefined) {
      const newSeriesId = body.series && Types.ObjectId.isValid(body.series) ? String(body.series) : null;

      // Remove this chapter from any other series that currently holds it
      await Series.updateMany(
        { _id: { $ne: newSeriesId }, "chapters.content": new Types.ObjectId(chapterId) },
        { $pull: { chapters: { content: new Types.ObjectId(chapterId) } } }
      );

      // Add to the newly selected series if not already inside it
      if (newSeriesId) {
        const targetSeries = await Series.findById(newSeriesId);
        if (targetSeries) {
          const existsInSeries = targetSeries.chapters?.some(
            (item: any) => String(item.content) === String(chapterId)
          );
          if (!existsInSeries) {
            const nextOrder = targetSeries.chapters?.length
              ? Math.max(...targetSeries.chapters.map((c: any) => c.order || 0)) + 1
              : 1;
            targetSeries.chapters.push({
              content: new Types.ObjectId(chapterId),
              contentModel: "Chapter",
              order: nextOrder,
            });
            await targetSeries.save();
          }
        }
      }
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
    // Also clean up from any Series
    await Series.updateMany(
      { "chapters.content": new Types.ObjectId(id) },
      { $pull: { chapters: { content: new Types.ObjectId(id) } } }
    );

    return NextResponse.json({ success: true, message: "Chapter deleted successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to delete chapter" },
      { status: 500 }
    );
  }
}