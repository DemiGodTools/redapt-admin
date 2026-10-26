import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import connectMongo from "@/lib/connectMongo";
import { Series } from "@/models/Series.model";

export async function POST(req: NextRequest) {
  try {
    await connectMongo();
    const body = await req.json();

    const {
      title,
      description,
      cover,
      category,
      subCategory,
      type = "normal",
      for: plan = 0,
      author,
      fee,
      recommendationBookId,
      recommendationText,
    } = body;

    // Basic Validation
    if (!title?.trim() || !description?.trim() || !cover?.trim() || !category) {
      return NextResponse.json(
        { success: false, message: "Title, description, cover, and category are required." },
        { status: 400 }
      );
    }

    if (!Types.ObjectId.isValid(category)) {
      return NextResponse.json(
        { success: false, message: "Invalid category ID." },
        { status: 400 }
      );
    }

    const newSeries = await Series.create({
      title: title.trim(),
      description: description.trim(),
      cover: cover.trim(),
      category: new Types.ObjectId(category),
      subCategory: subCategory && Types.ObjectId.isValid(subCategory) ? new Types.ObjectId(subCategory) : null,
      for: Number(plan) || 0,
      type: type === "framework" ? "framework" : "normal",
      author: type === "framework" ? author?.trim() || "" : "",
      fee: type === "framework" ? Number(fee) || 0 : 0,
      recommendationBookId: (type === "framework" && recommendationBookId && Types.ObjectId.isValid(recommendationBookId)) 
        ? new Types.ObjectId(recommendationBookId) 
        : null,
      recommendationText: type === "framework" ? recommendationText?.trim() || "" : "",
      chapters: [],
      joinedBy: [],
    });

    return NextResponse.json(
      { success: true, message: "Series created successfully!", data: newSeries },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create Series Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to create series" },
      { status: 500 }
    );
  }
}