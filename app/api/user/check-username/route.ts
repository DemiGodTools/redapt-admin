import { NextRequest, NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { User } from "@/models/User.model";
import { getAuthenticatedUser } from "@/lib/userAuth";

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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawUsername = searchParams.get("username");

    if (!rawUsername) {
      return NextResponse.json(
        { available: false, message: "Username query parameter is required" },
        { status: 400 }
      );
    }

    const cleanUsername = rawUsername.trim().toLowerCase();

    // 1. Length validation (3 - 20 chars)
    if (cleanUsername.length < 3) {
      return NextResponse.json({
        available: false,
        message: "Username must be at least 3 characters",
      });
    }

    if (cleanUsername.length > 20) {
      return NextResponse.json({
        available: false,
        message: "Username must not exceed 20 characters",
      });
    }

    // 2. Character pattern: letters, numbers, underscores only
    const validPattern = /^[a-zA-Z0-9_]+$/;
    if (!validPattern.test(cleanUsername)) {
      return NextResponse.json({
        available: false,
        message: "Username can only contain letters, numbers, and underscores",
      });
    }

    // 3. Reserved names check
    if (RESERVED_USERNAMES.has(cleanUsername)) {
      return NextResponse.json({
        available: false,
        message: "This username is reserved and cannot be used",
      });
    }

    // 4. Authenticate caller (if token present) to check if it's their own username
    const authUser = await getAuthenticatedUser(req);
    const requestingEmail: string | null = authUser?.email || null;

    await connectMongo();

    // 5. Query user by indexed userId (lean + selected fields for blazing speed)
    const existing = await User.findOne({ userId: cleanUsername })
      .select("_id email userId")
      .lean();

    if (!existing) {
      return NextResponse.json(
        { available: true, message: "Username is available!" },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    // If it's already the current user's username
    if (requestingEmail && existing.email?.toLowerCase() === requestingEmail.toLowerCase()) {
      return NextResponse.json(
        { available: true, isCurrent: true, message: "This is your current username" },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    return NextResponse.json(
      { available: false, message: "Username is already taken" },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    console.error("Check username error:", error);
    return NextResponse.json(
      { available: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

