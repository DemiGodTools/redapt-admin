import { NextRequest, NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { User } from "@/models/User.model";
import { getVerifiedUserAndEntitlement } from "@/lib/verifyUserEntitlement";

export const dynamic = "force-dynamic";

const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "readapt",
  "root",
  "support",
  "help",
  "official",
  "moderator",
  "system",
  "api",
  "dev",
  "developer",
  "guest",
  "null",
  "undefined",
]);

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
// Letters (any script), numbers, spaces and the punctuation people actually
// put in a display name. Blocks control characters, quotes and markup.
const NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} ._'-]*$/u;

const PROFILE_FIELDS =
  "_id email name userId image imageMd imageSm bio profession interests visibility profileLevel joinedSeries correctAnsStreak streakData subscription isProfileCompleted";

const cleanText = (value: unknown, max: number): string =>
  typeof value === "string"
    ? value.replace(/\s+/g, " ").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max)
    : "";

/**
 * Lightweight profile edit used by the mobile "Edit profile" sheet.
 *
 * Unlike /update/profile-setup this does not populate likes/recent reads and
 * does not require profession/bio/interests to be resent just to rename the
 * account, so a rename is a single small round-trip.
 */
export async function POST(req: NextRequest) {
  try {
    // Must run before any query (including the auth lookup), otherwise Mongoose
    // buffers the first request of a cold serverless invocation.
    await connectMongo();

    const { user } = await getVerifiedUserAndEntitlement(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please log in again." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, message: "Invalid request body" },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};
    const errors: Record<string, string> = {};

    if (body.name !== undefined) {
      const name = cleanText(body.name, 40);
      if (name.length < 2) {
        errors.name = "Name must be at least 2 characters";
      } else if (name.length > 40) {
        errors.name = "Name must be 40 characters or fewer";
      } else if (!NAME_PATTERN.test(name)) {
        errors.name = "Name contains characters that are not allowed";
      } else {
        updates.name = name;
      }
    }

    let nextUsername: string | null = null;
    if (body.username !== undefined) {
      const username = String(body.username || "").trim().toLowerCase();
      if (!USERNAME_PATTERN.test(username)) {
        errors.username = "Use 3–20 letters, numbers or underscores";
      } else if (RESERVED_USERNAMES.has(username)) {
        errors.username = "That username is reserved";
      } else {
        nextUsername = username;
      }
    }

    if (body.bio !== undefined) {
      const bio = typeof body.bio === "string" ? body.bio.replace(/\s+/g, " ").trim() : "";
      if (bio.length > 160) {
        errors.bio = "Bio must be 160 characters or fewer";
      } else {
        updates.bio = bio;
      }
    }

    if (body.profession !== undefined) {
      updates.profession = cleanText(body.profession, 40);
    }

    if (body.interests !== undefined) {
      const interests = Array.isArray(body.interests)
        ? body.interests
            .filter((item: unknown): item is string => typeof item === "string")
            .map((item: string) => cleanText(item, 32))
            .filter(Boolean)
            .slice(0, 12)
        : [];
      updates.interests = interests;
    }

    if (body.visibility !== undefined) {
      updates.visibility = body.visibility === "Private" ? "Private" : "Public";
    }

    if (nextUsername && nextUsername !== user.userId) {
      const taken = await User.findOne({
        userId: nextUsername,
        _id: { $ne: user._id },
      })
        .select("_id")
        .lean();
      if (taken) {
        errors.username = "That username is already taken";
      } else {
        updates.userId = nextUsername;
        updates.usernameLastChangedAt = new Date();
      }
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { success: false, message: Object.values(errors)[0], errors },
        { status: 400 }
      );
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, message: "Nothing to update" },
        { status: 400 }
      );
    }

    const updated = await User.findByIdAndUpdate(
      user._id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .select(PROFILE_FIELDS)
      .lean();

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Profile updated", user: updated },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error: any) {
    console.error("UPDATE DETAILS ERROR:", error);
    // Mongo duplicate key from a concurrent rename.
    if (error?.code === 11000) {
      return NextResponse.json(
        { success: false, message: "That username is already taken" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, message: "Could not update profile" },
      { status: 500 }
    );
  }
}
