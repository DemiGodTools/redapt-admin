import { NextResponse } from "next/server";
import connectDB from "@/lib/connectMongo";
import { Category } from "@/models/Category.model";
import { Chapter } from "@/models/Chapter.model";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();

    const [allCategories, chapters] = await Promise.all([
      Category.find({}).sort({ order: 1, name: 1 }).lean(),
      Chapter.find({}, { category: 1, subCategory: 1, type: 1 }).lean(),
    ]);

    // Count content per category and subcategory
    const categoryContentCount: Record<string, { total: number; pdf: number; audio: number }> = {};
    const subCategoryContentCount: Record<string, { total: number; pdf: number; audio: number }> = {};

    for (const ch of chapters) {
      if (ch.category) {
        const catId = ch.category.toString();
        if (!categoryContentCount[catId]) {
          categoryContentCount[catId] = { total: 0, pdf: 0, audio: 0 };
        }
        categoryContentCount[catId].total += 1;
        if (ch.type === "pdf") categoryContentCount[catId].pdf += 1;
        if (ch.type === "audio") categoryContentCount[catId].audio += 1;
      }

      if (ch.subCategory) {
        const subId = ch.subCategory.toString();
        if (!subCategoryContentCount[subId]) {
          subCategoryContentCount[subId] = { total: 0, pdf: 0, audio: 0 };
        }
        subCategoryContentCount[subId].total += 1;
        if (ch.type === "pdf") subCategoryContentCount[subId].pdf += 1;
        if (ch.type === "audio") subCategoryContentCount[subId].audio += 1;
      }
    }

    const mainCategories = allCategories.filter((c: any) => !c.parentCategory);

    const categoriesTree = mainCategories.map((mainCat: any) => {
      const catIdStr = mainCat._id.toString();
      const subCategories = allCategories
        .filter(
          (c: any) =>
            c.parentCategory && c.parentCategory.toString() === catIdStr
        )
        .map((sub: any) => {
          const subIdStr = sub._id.toString();
          return {
            ...sub,
            counts: subCategoryContentCount[subIdStr] || { total: 0, pdf: 0, audio: 0 },
          };
        });

      return {
        ...mainCat,
        counts: categoryContentCount[catIdStr] || { total: 0, pdf: 0, audio: 0 },
        subCategories,
      };
    });

    return NextResponse.json({
      success: true,
      count: categoriesTree.length,
      data: categoriesTree,
    });
  } catch (error: any) {
    console.error("GET /api/user/category error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

