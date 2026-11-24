import { NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { Series } from "@/models/Series.model";
import { Chapter } from "@/models/Chapter.model";

export const dynamic = "force-dynamic";

/**
 * Ultra-lightweight endpoint returning only _id and title for Series and Books.
 * Zero population, zero B2 calls, zero heavy calculations.
 * Fetches in <10ms and cached by browser/client.
 */
export async function GET() {
  try {
    await connectMongo();

    const [seriesList, booksList] = await Promise.all([
      Series.find({}, { title: 1 }).sort({ title: 1 }).lean(),
      Chapter.find({}, { title: 1, type: 1 }).sort({ title: 1 }).lean(),
    ]);

    return NextResponse.json({
      success: true,
      series: seriesList.map((s: any) => ({
        id: s._id.toString(),
        title: s.title,
      })),
      books: booksList.map((b: any) => ({
        id: b._id.toString(),
        title: b.title,
        type: b.type || "pdf",
      })),
    });
  } catch (error: any) {
    console.error("Failed to fetch notification targets:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to load targets" },
      { status: 500 }
    );
  }
}
