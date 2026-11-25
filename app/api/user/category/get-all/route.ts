import { NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { Category } from "@/models/Category.model";

export async function GET() {
  try {
    await connectMongo();

    const categories = await Category.find()
      .sort({ name: 1 })
      .lean();

    return NextResponse.json(
      {
        success: true,
        count: categories.length,
        data: categories,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    console.error("GET CATEGORIES ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
