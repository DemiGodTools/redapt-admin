import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { b2Client, B2_BUCKET, getB2PublicUrl } from "@/lib/b2";
import { jwtVerify } from "jose";

export const dynamic = "force-dynamic";

const ALLOWED_FOLDERS = new Set(["media", "covers", "banners", "avatars", "profiles", "books", "chapters"]);

const ALLOWED_MIME_PREFIXES = [
  "image/",
  "audio/",
  "application/pdf",
  "application/octet-stream",
];

async function isAuthorizedCaller(req: NextRequest): Promise<boolean> {
  // 1. Admin Secret header check
  const adminSecret = req.headers.get("x-admin-secret") || req.headers.get("admin-secret");
  if (adminSecret && process.env.ADMIN_SECRET && adminSecret === process.env.ADMIN_SECRET) {
    return true;
  }

  // 2. Bearer JWT check (User or Admin)
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (token && token !== "undefined" && token !== "null") {
      try {
        const rawSecret =
          process.env.JWT_SECRET ||
          process.env.NEXTAUTH_SECRET ||
          "readapt_super_secret_jwt_key_12345";
        const secret = new TextEncoder().encode(rawSecret.trim());
        await jwtVerify(token, secret);
        return true;
      } catch {}
    }
  }

  // 3. In dev mode allow testing
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  return false;
}

export async function POST(req: NextRequest) {
  try {
    const authorized = await isAuthorizedCaller(req);
    if (!authorized) {
      return NextResponse.json(
        { error: "Unauthorized: authentication required to request upload presigned URLs" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { filename, contentType, folder = "media" } = body;

    if (!filename || typeof filename !== "string") {
      return NextResponse.json(
        { error: "Valid filename is required" },
        { status: 400 }
      );
    }

    const cleanFolder = folder.toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!ALLOWED_FOLDERS.has(cleanFolder)) {
      return NextResponse.json(
        { error: `Invalid folder target. Allowed: ${Array.from(ALLOWED_FOLDERS).join(", ")}` },
        { status: 400 }
      );
    }

    const cleanContentType = (contentType || "application/octet-stream").toLowerCase();
    const isMimeAllowed = ALLOWED_MIME_PREFIXES.some((prefix) => cleanContentType.startsWith(prefix));
    if (!isMimeAllowed) {
      return NextResponse.json(
        { error: "Disallowed MIME type for upload" },
        { status: 400 }
      );
    }

    const sanitizedName = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `${cleanFolder}/${Date.now()}-${sanitizedName}`;

    const command = new PutObjectCommand({
      Bucket: B2_BUCKET,
      Key: key,
      ContentType: cleanContentType,
    });

    // 10-minute validity for upload
    const uploadUrl = await getSignedUrl(b2Client, command, { expiresIn: 600 });
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
