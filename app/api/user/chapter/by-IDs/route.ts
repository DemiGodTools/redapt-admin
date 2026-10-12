import "@/models/Category.model";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import connectMongo from "@/lib/connectMongo";
import { Chapter } from "@/models/Chapter.model";

interface ByIdsBody {
  ids: string[];
}

export async function POST(req: Request) {
  try {
    await connectMongo();

    const body = (await req.json()) as ByIdsBody;

    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json(
        { success: false, message: "ids array is required" },
        { status: 400 }
      );
    }

    const validIds = body.ids.filter((id) => Types.ObjectId.isValid(id));

    if (validIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const chapters = await Chapter.find({
      _id: { $in: validIds },
    })
      .populate("category")
      .lean();

    return NextResponse.json({
      success: true,
      count: chapters.length,
      chapters,
    });
  } catch (err) {
    console.error("Get Chapters By IDs Error:", err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
