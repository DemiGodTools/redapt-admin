import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import connectMongo from "@/lib/connectMongo";
import { Series } from "@/models/Series.model";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> } // ⚡ Next.js 15 fix
) {
  try {
    await connectMongo();
    
    // ⚡ await karna zaroori hai
    const { id } = await context.params;

    if (!id || !Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Valid Series ID is required" },
        { status: 400 }
      );
    }

    const body = await req.json();

    const updateFields: any = {};
    if (body.title !== undefined) updateFields.title = body.title.trim();
    if (body.description !== undefined) updateFields.description = body.description.trim();
    if (body.cover !== undefined) updateFields.cover = body.cover.trim();
    if (body.for !== undefined) updateFields.for = Number(body.for);
    if (body.author !== undefined) updateFields.author = body.author.trim(); // ⚡ Author dono (normal/framework) mein enable kar diya
    
    // ⚡ 1. Chapter Assignment (Drag & Drop) Update Support
    if (body.chapters !== undefined && Array.isArray(body.chapters)) {
      updateFields.chapters = body.chapters;
    }

    if (body.category && Types.ObjectId.isValid(body.category)) {
      updateFields.category = new Types.ObjectId(body.category);
    }
    if (body.subCategory !== undefined) {
      updateFields.subCategory = body.subCategory && Types.ObjectId.isValid(body.subCategory) ? new Types.ObjectId(body.subCategory) : null;
    }

    // ⚡ 2. Handle Type and Framework Specific Fields (FEE REMOVED)
    if (body.type !== undefined) {
      updateFields.type = body.type === "framework" ? "framework" : "normal";
      if (updateFields.type === "framework") {
        updateFields.recommendationBookId = body.recommendationBookId && Types.ObjectId.isValid(body.recommendationBookId) ? new Types.ObjectId(body.recommendationBookId) : null;
        updateFields.recommendationText = body.recommendationText?.trim() || "";
      } else {
        updateFields.recommendationBookId = null;
        updateFields.recommendationText = "";
      }
    }

    const updatedSeries = await Series.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true }
    );

    if (!updatedSeries) {
      return NextResponse.json(
        { success: false, message: "Series not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Series updated successfully!",
      data: updatedSeries,
    });
  } catch (error: any) {
    console.error("Update Series Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to update series" },
      { status: 500 }
    );
  }
}