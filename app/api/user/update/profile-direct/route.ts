import { NextRequest, NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { User } from "@/models/User.model";

export async function POST(req: NextRequest) {
  try {
    await connectMongo();

    const userEmail = req.headers.get("x-user-email");
    if (!userEmail) {
      return NextResponse.json(
        { success: false, message: "Unauthorized (no user email)" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const image = body?.image;

    if (typeof image !== "string" || !image.startsWith("data:image/")) {
      return NextResponse.json(
        { success: false, message: "Invalid image payload" },
        { status: 400 },
      );
    }

    if (image.length > 1_800_000) {
      return NextResponse.json(
        { success: false, message: "Image is too large" },
        { status: 413 },
      );
    }

    const user = await User.findOneAndUpdate(
      { email: userEmail },
      { $set: { image, updatedAt: new Date() } },
      { new: true },
    );

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      url: image,
      user,
    });
  } catch (error) {
    console.error("Profile direct upload error:", error);
    return NextResponse.json(
      { success: false, message: "Upload failed" },
      { status: 500 },
    );
  }
}
