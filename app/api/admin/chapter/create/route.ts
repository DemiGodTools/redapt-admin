import { logActivity } from "@/lib/activityLogger";
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { MediaType, SubscriptionPlan } from "@/enums";
import { Chapter } from "@/models/Chapter.model";
import connectMongo from "@/lib/connectMongo";
import { CreateChapterBody } from "@/types/Body";
import { Series } from "@/models/Series.model";

export async function POST(req: NextRequest) {
  try {
    await connectMongo();

    const body = (await req.json()) as CreateChapterBody;

    const required: (keyof CreateChapterBody)[] = [
      "title",
      "details",
      "media",
      "cover",
      "author",
    ];

    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, message: `${field} is required` },
          { status: 400 }
        );
      }
    }

    let categoryId: string | undefined = body.category;

    if (!categoryId && body.series) {
      const series = await Series.findById(body.series).select("category");

      if (!series) {
        return NextResponse.json(
          { success: false, message: "Invalid series id" },
          { status: 400 }
        );
      }

      categoryId = series.category.toString();
    }

    if (!categoryId) {
      return NextResponse.json(
        {
          success: false,
          message: "Either category or series is required",
        },
        { status: 400 }
      );
    } else {
      if (!Types.ObjectId.isValid(categoryId)) {
        return NextResponse.json(
          { success: false, message: "Invalid category id" },
          { status: 400 }
        );
      }
    }

    if (body.series && !Types.ObjectId.isValid(body.series)) {
      return NextResponse.json(
        { success: false, message: "Invalid series id" },
        { status: 400 }
      );
    }

    const lyricsText = (body.lyrics || body.transcript || "").trim();

    const chapter = await Chapter.create({
      title: body.title,
      details: body.details,
      media: body.media,
      type: body.type ?? MediaType.PDF,
      for: body.for ?? SubscriptionPlan.FREE,
      cover: body.cover,
      category: categoryId,
      series: body.series || undefined,
      author: body.author,
      isDownloadable: body.isDownloadable ?? true,
      toc: body.toc ?? [],
      transcript: lyricsText,
      lyrics: lyricsText,
    });

    const adminRole = req.headers.get("x-admin-role") || "admin";
    const adminName = req.headers.get("x-admin-name") || "Admin";
    await logActivity({
      action: "CHAPTER_ADDED",
      category: "content",
      title: chapter.title,
      description: "New chapter published in catalog",
      performedBy: adminName,
      performedByRole: adminRole,
      metadata: { chapterId: chapter._id.toString() },
    }).catch(() => {});

    return NextResponse.json({ success: true, data: chapter }, { status: 201 });
  } catch (err) {
    console.error("Create chapter error:", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
