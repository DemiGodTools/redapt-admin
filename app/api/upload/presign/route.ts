import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { b2Client, B2_BUCKET, getB2PublicUrl } from "@/lib/b2";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { filename, contentType, folder = "media" } = body;

    if (!filename) {
      return NextResponse.json(
        { error: "filename is required" },
        { status: 400 }
      );
    }

    const sanitizedName = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `${folder}/${Date.now()}-${sanitizedName}`;

    const command = new PutObjectCommand({
      Bucket: B2_BUCKET,
      Key: key,
      ContentType: contentType || "application/octet-stream",
    });

    // 15-minute validity for upload
    const uploadUrl = await getSignedUrl(b2Client, command, { expiresIn: 900 });
    const publicUrl = getB2PublicUrl(key);

    return NextResponse.json({
      success: true,
      uploadUrl,
      publicUrl,
      key,
    });
  } catch (error: any) {
    console.error("Presign error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}

