import { NextRequest, NextResponse } from "next/server";
import { utapi } from "@/app/api/uploadthing/core";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file uploaded" },
        { status: 400 }
      );
    }

    // ⚡ UploadThing UTApi ke zariye direct cloud upload
    const response = await utapi.uploadFiles(file);

    if (response?.error) {
      return NextResponse.json(
        { success: false, message: response.error.message || "Upload failed" },
        { status: 500 }
      );
    }

    const publicUrl = response?.data?.ufsUrl || response?.data?.url;

    if (!publicUrl) {
      return NextResponse.json(
        { success: false, message: "Failed to retrieve uploaded file URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      name: file.name,
      size: file.size,
    });
  } catch (error: any) {
    console.error("Direct Upload API Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Internal upload error" },
      { status: 500 }
    );
  }
}