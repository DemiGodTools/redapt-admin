import { NextRequest, NextResponse } from "next/server";
import { uploadBufferToB2 } from "@/lib/b2";
import { User } from "@/models/User.model";
import connectMongo from "@/lib/connectMongo";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const userEmail = req.headers.get("x-user-email");
    if (!userEmail) {
      return NextResponse.json(
        { success: false, message: "Unauthorized (no user email)" },
        { status: 401 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const publicUrl = await uploadBufferToB2(
      buffer,
      file.name,
      file.type || "image/jpeg",
      "profiles"
    );

    await connectMongo();

    const user = await User.findOneAndUpdate(
      { email: userEmail },
      { $set: { image: publicUrl } },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      url: publicUrl,
      user,
    });
  } catch (error: any) {
    console.error("Profile image upload error:", error);
    return NextResponse.json({ error: error?.message || "Upload failed" }, { status: 500 });
  }
}
