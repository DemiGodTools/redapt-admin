import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/connectMongo";
import { Category } from "@/models/Category.model";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

// 1. GET: Fetch Categories and their Sub-categories
export async function GET() {
  try {
    await connectDB();

    // Direct find use karein (Aggregation se zyada safe aur reliable)
    const allCategories = await Category.find({}).sort({ order: 1, name: 1 }).lean();

    // JavaScript me clean tree structure banayein (Zero Aggregation crash risk)
    const mainCategories = allCategories.filter(
      (c: any) => !c.parentCategory
    );

    const categoriesTree = mainCategories.map((mainCat: any) => {
      const subCategories = allCategories.filter(
        (c: any) =>
          c.parentCategory &&
          c.parentCategory.toString() === mainCat._id.toString()
      );
      return {
        ...mainCat,
        subCategories,
      };
    });

    return NextResponse.json({
      success: true,
      data: categoriesTree,
    });
  } catch (error: any) {
    console.error("GET /api/category error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

// 2. POST: Create Main or Sub-Category
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { name, image, description, parentCategory, order } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, message: "Name is required" },
        { status: 400 }
      );
    }

    const payload: any = {
      name: name.trim(),
      image:
        image && image.trim() !== ""
          ? image.trim()
          : "https://placeholder.co/300x300/222/FFF.png?text=Category",
      description: description ? description.trim() : "",
      order: order ? Number(order) : 0,
      parentCategory: null,
    };

    if (parentCategory && mongoose.Types.ObjectId.isValid(parentCategory)) {
      payload.parentCategory = new mongoose.Types.ObjectId(parentCategory);
    }

    const newCategory = await Category.create(payload);

    return NextResponse.json({
      success: true,
      data: newCategory,
    });
  } catch (error: any) {
    console.error("POST /api/category error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create category" },
      { status: 500 }
    );
  }
}

// 3. PUT: Edit Category
export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { id, name, image, description, parentCategory, order } = body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Valid Category ID required" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (image) updateData.image = image.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (order !== undefined) updateData.order = Number(order);

    if (parentCategory && mongoose.Types.ObjectId.isValid(parentCategory)) {
      updateData.parentCategory = new mongoose.Types.ObjectId(parentCategory);
    } else {
      updateData.parentCategory = null;
    }

    const updated = await Category.findByIdAndUpdate(id, updateData, { new: true });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error("PUT /api/category error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update category" },
      { status: 500 }
    );
  }
}

// 4. DELETE: Delete Category
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Valid Category ID required" },
        { status: 400 }
      );
    }

    const objectId = new mongoose.Types.ObjectId(id);

    await Category.deleteMany({
      $or: [{ _id: objectId }, { parentCategory: objectId }],
    });

    return NextResponse.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error: any) {
    console.error("DELETE /api/category error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete category" },
      { status: 500 }
    );
  }
}