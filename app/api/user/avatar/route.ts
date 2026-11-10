import { NextRequest, NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { uploadBufferToB2 } from "@/lib/b2";
import { User } from "@/models/User.model";
import { getVerifiedUserAndEntitlement } from "@/lib/verifyUserEntitlement";

export const dynamic = "force-dynamic";

const MAX_VARIANT_BYTES = 3 * 1024 * 1024;
const VARIANTS = [
  { field: "sm", column: "imageSm", suffix: "sm" },
  { field: "md", column: "imageMd", suffix: "md" },
  { field: "lg", column: "image", suffix: "lg" },
] as const;

const PROFILE_FIELDS =
  "_id email name userId image imageMd imageSm bio profession interests visibility profileLevel joinedSeries correctAnsStreak streakData subscription isProfileCompleted";

/**
 * Verifies the real file signature instead of trusting the client-supplied
 * Content-Type. An .exe renamed to .jpg, or a PNG claiming to be JPEG, is
 * rejected here before it ever reaches storage.
 */
function sniffImageMime(buffer: Buffer): "image/jpeg" | "image/png" | "image/webp" | null {
  if (buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

/**
 * Multi-resolution profile photo upload.
 *
 * The client resizes locally and posts up to three square JPEGs (128/256/512).
 * Storing all three means a 32px comment avatar downloads ~6 KB instead of the
 * full-size photo, while the profile header still gets a crisp 512px image.
 */
export async function POST(req: NextRequest) {
  try {
    // Auth resolves the user from Mongo, so connect before that lookup.
    await connectMongo();

    const { user } = await getVerifiedUserAndEntitlement(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please log in again." },
        { status: 401 }
      );
    }

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { success: false, message: "Expected a multipart image upload" },
        { status: 415 }
      );
    }

    const formData = await req.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json(
        { success: false, message: "Could not read the uploaded image" },
        { status: 400 }
      );
    }

    const uploads: Array<{ column: string; url: string }> = [];

    for (const variant of VARIANTS) {
      const file = formData.get(variant.field);
      if (!(file instanceof File)) continue;

      if (file.size > MAX_VARIANT_BYTES) {
        return NextResponse.json(
          {
            success: false,
            message: "That image is too large. Please choose one under 10 MB.",
          },
          { status: 413 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const mime = sniffImageMime(buffer);
      if (!mime) {
        return NextResponse.json(
          {
            success: false,
            message: "Unsupported image format. Use JPG, PNG or WebP.",
          },
          { status: 415 }
        );
      }

      const extension = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
      const { url } = await uploadBufferToB2(
        buffer,
        `avatar-${String(user._id)}-${variant.suffix}-${Date.now()}.${extension}`,
        mime,
        "profiles"
      );

      uploads.push({ column: variant.column, url });
    }

    if (uploads.length === 0) {
      return NextResponse.json(
        { success: false, message: "No image was uploaded" },
        { status: 400 }
      );
    }

    const setFields: Record<string, string> = {};
    for (const upload of uploads) setFields[upload.column] = upload.url;

    // A single variant must still be usable as the main photo.
    if (!setFields.image) setFields.image = uploads[0].url;

    const updated = await User.findByIdAndUpdate(
      user._id,
      { $set: setFields },
      { new: true }
    )
      .select(PROFILE_FIELDS)
      .lean();

    return NextResponse.json(
      { success: true, urls: setFields, user: updated },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error: any) {
    console.error("AVATAR UPLOAD ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Could not upload the photo. Please try again." },
      { status: 500 }
    );
  }
}
