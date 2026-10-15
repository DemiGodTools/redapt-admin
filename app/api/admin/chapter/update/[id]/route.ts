import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import connectMongo from "@/lib/connectMongo";
import { Chapter } from "@/models/Chapter.model";
import { Series } from "@/models/Series.model";
import { IChapter } from "@/types/Chapter";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: chapterId } = await params;
    await connectMongo();
    const body = await req.json();

    const update: Partial<IChapter> = {};

    const fields: (keyof IChapter)[] = [
      "title",
      "details",
      "media",
      "type",
      "for",
      "isTrending",
      "cover",
      "author",
      "isDownloadable",
      "toc",
      "questions", // 👈 Chapter-level questions field add ho gaya
    ];

    for (const field of fields) {
      if (body[field] !== undefined) {
        if (field === "questions") {
          // Convert array of string IDs to ObjectId array safely
          if (Array.isArray(body.questions)) {
            update.questions = body.questions
              .filter((qId: any) => Types.ObjectId.isValid(qId))
              .map((qId: any) => new Types.ObjectId(String(qId)));
          }
        } else {
          update[field] = body[field];
        }
      }
    }

    // Special case: series provided but category missing
    if (body.series && !body.category) {
      const series = await Series.findById(body.series).select("category");
      if (!series) {
        return NextResponse.json(
          { success: false, message: "Invalid series" },
          { status: 400 }
        );
      }
      update.series = body.series;
      update.category = series.category;
    }

    if (body.category) {
      update.category = body.category;
    }

    const chapter = await Chapter.findByIdAndUpdate(
      chapterId,
      { $set: update },
      { new: true }
    );

    if (!chapter) {
      return NextResponse.json(
        { success: false, message: "Chapter not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, chapter });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, message: "Chapter update failed" },
      { status: 500 }
    );
  }
}