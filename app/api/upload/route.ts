import { NextRequest, NextResponse } from "next/server";
import { uploadBufferToB2 } from "@/lib/b2";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const folder = (formData.get("folder") as string) || "media";

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file uploaded" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await uploadBufferToB2(
      buffer,
      file.name,
      file.type || "application/octet-stream",
      folder
    );

    return NextResponse.json({
      success: true,
      url: result.url,
      key: result.key,
      name: file.name,
      size: file.size,
    });
  } catch (error: any) {
    console.error("Backblaze B2 Upload Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Internal upload error" },
      { status: 500 }
    );
  }
}
