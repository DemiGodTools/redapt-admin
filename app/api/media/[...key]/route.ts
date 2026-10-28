import { NextRequest, NextResponse } from "next/server";
import { getB2SignedDownloadUrl } from "@/lib/b2";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key: keySegments } = await params;
    if (!keySegments || keySegments.length === 0) {
      return NextResponse.json({ error: "Missing media key" }, { status: 400 });
    }

    const key = keySegments.join("/");
    // Generate secure signed URL valid for 2 hours
    const signedUrl = await getB2SignedDownloadUrl(key, 7200);

    // Redirect client directly to the secure S3 stream
    return NextResponse.redirect(signedUrl, 307);
  } catch (error: any) {
    console.error("Media stream redirect error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to stream media" },
      { status: 500 }
    );
  }
}

