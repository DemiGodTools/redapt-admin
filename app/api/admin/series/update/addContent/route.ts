import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import connectMongo from "@/lib/connectMongo";
import { Series } from "@/models//Series.model";
import { ISeriesContent } from "@/types/Series";
import { Chapter } from "@/models/Chapter.model";
import { Question } from "@/models/Question.model";
import { AddSeriesContentBody } from "@/types/Body";


export async function POST(req: NextRequest) {
  try {
    await connectMongo();

    const body = (await req.json()) as AddSeriesContentBody;

    const { series, content, contentModel, order } = body;

    if (!series || !content || !contentModel) {
      return NextResponse.json(
        {
          success: false,
          message: "series, content and contentModel are required",
        },
        { status: 400 }
      );
    }

    if (!Types.ObjectId.isValid(series)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid series id",
        },
        { status: 400 }
      );
    }

    if (!Types.ObjectId.isValid(content)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid content id",
        },
        { status: 400 }
      );
    }

    if (contentModel !== "Chapter" && contentModel !== "Question") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid content model",
        },
        { status: 400 }
      );
    }

    const seriesDoc = await Series.findById(series);

    if (!seriesDoc) {
      return NextResponse.json(
        {
          success: false,
          message: "Series not found",
        },
        { status: 404 }
      );
    }

    const exists =
      contentModel === "Chapter"
        ? await Chapter.exists({ _id: content })
        : await Question.exists({ _id: content });

    if (!exists) {
      return NextResponse.json(
        {
          success: false,
          message: `${contentModel} not found`,
        },
        { status: 404 }
      );
    }

    const alreadyAdded = seriesDoc.chapters.some(
      (item : ISeriesContent) =>
        item.content.toString() === content &&
        item.contentModel === contentModel
    );

    if (alreadyAdded) {
      return NextResponse.json(
        {
          success: false,
          message: "Content already exists in this series",
        },
        { status: 409 }
      );
    }

    const finalOrder =
      order ??
      (seriesDoc.chapters.length
        ? Math.max(...seriesDoc.chapters.map((c: ISeriesContent) => c.order)) + 1
        : 1);

    seriesDoc.chapters.push({
      content,
      contentModel,
      order: finalOrder,
    });

    // Keep Chapter.series in sync so content no longer appears as standalone
    if (contentModel === "Chapter") {
      await Chapter.findByIdAndUpdate(content, { series: seriesDoc._id });
    }

    await seriesDoc.save();

    return NextResponse.json(
      {
        success: true,
        message: "Content added successfully",
        data: seriesDoc,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Add Series Content Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal Server Error",
      },
      { status: 500 }
    );
  }
}