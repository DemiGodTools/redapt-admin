import { NextRequest, NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { User } from "@/models/User.model";
import { jwtVerify } from "jose";
import { logActivity } from "@/lib/activityLogger";

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

export async function POST(req: NextRequest) {
  try {
    let userEmail: string | null = req.headers.get("x-user-email");
    if (!userEmail) {
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
            const { payload } = await jwtVerify(token, secret);
            userEmail = ((payload as any)?.email || (payload as any)?.user?.email || null) as string | null;
          } catch {}
        }
      }
    }

    if (!userEmail) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please login again." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { name, username, profession, bio, interests, visibility, image, profilePhoto } = body;

    // Validate Name
    const cleanName = typeof name === "string" ? name.trim() : "";
    if (cleanName.length < 2) {
      return NextResponse.json(
        { success: false, message: "Name must be at least 2 characters" },
        { status: 400 }
      );
    }

    // Validate Username
    const cleanUsername = typeof username === "string" ? username.trim().toLowerCase() : "";
    if (cleanUsername.length < 3 || cleanUsername.length > 20) {
      return NextResponse.json(
        { success: false, message: "Username must be between 3 and 20 characters" },
        { status: 400 }
      );
    }

    const validPattern = /^[a-zA-Z0-9_]+$/;
    if (!validPattern.test(cleanUsername)) {
      return NextResponse.json(
        { success: false, message: "Username can only contain letters, numbers, and underscores" },
        { status: 400 }
      );
    }

    if (RESERVED_USERNAMES.has(cleanUsername)) {
      return NextResponse.json(
        { success: false, message: "This username is reserved and cannot be used" },
        { status: 400 }
      );
    }

    // Validate Profession
    const cleanProfession = typeof profession === "string" ? profession.trim() : "";
    if (!cleanProfession) {
      return NextResponse.json(
        { success: false, message: "Please select a profession" },
        { status: 400 }
      );
    }

    // Clean Bio
    const cleanBio = typeof bio === "string" ? bio.trim().slice(0, 160) : "";

    // Clean Interests
    const cleanInterests = Array.isArray(interests)
      ? interests.filter((i) => typeof i === "string" && i.trim().length > 0)
      : [];

    // Clean Visibility
    const cleanVisibility = visibility === "Private" ? "Private" : "Public";

    await connectMongo();

    const currentUser = await User.findOne({ email: userEmail });
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // If username is changing, ensure uniqueness
    if (currentUser.userId !== cleanUsername) {
      const existingUser = await User.findOne({
        userId: cleanUsername,
        _id: { $ne: currentUser._id },
      })
        .select("_id")
        .lean();

      if (existingUser) {
        return NextResponse.json(
          { success: false, message: "This username is already taken. Please choose another." },
          { status: 409 }
        );
      }
    }

    // Update user document
    currentUser.name = cleanName;
    currentUser.userId = cleanUsername;
    currentUser.profession = cleanProfession;
    currentUser.bio = cleanBio;
    currentUser.interests = cleanInterests;
    currentUser.visibility = cleanVisibility;
    currentUser.isProfileCompleted = true;
    currentUser.usernameLastChangedAt = new Date();

    const photoToSet = (typeof image === "string" && image.trim()) || (typeof profilePhoto === "string" && profilePhoto.trim());
    if (photoToSet) {
      currentUser.image = photoToSet;
    }

    await currentUser.save();

    const populatedUser = await User.findById(currentUser._id)
      .populate("likes")
      .populate({
        path: "recentReads.chapter",
        populate: { path: "category" },
      })
      .select("-__v");

    logActivity({
      action: "PROFILE_SETUP_COMPLETED",
      category: "auth",
      title: `${cleanName} (@${cleanUsername})`,
      description: `Completed profile setup with profession "${cleanProfession}" and ${cleanVisibility} visibility`,
      performedBy: cleanName || userEmail,
      performedByRole: "user",
      metadata: { userId: currentUser._id.toString() },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully!",
      user: populatedUser || currentUser,
    });
  } catch (error: any) {
    console.error("Profile setup error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to save profile" },
      { status: 500 }
    );
  }
}
