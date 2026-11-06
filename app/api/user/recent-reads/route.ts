import { NextRequest, NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { User } from "@/models/User.model";
import "@/models/Chapter.model";
import "@/models/Category.model";
import { jwtVerify } from "jose";

async function getEmailFromRequest(req: NextRequest): Promise<string | null> {
  let email = req.headers.get("x-user-email");
  if (email) return email;

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
        return ((payload as any)?.email || (payload as any)?.user?.email || null) as string | null;
      } catch {}
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const email = await getEmailFromRequest(req);
    if (!email) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectMongo();
    const user = await User.findOne({ email })
      .populate({
        path: "recentReads.chapter",
        populate: { path: "category" },
      })
      .select("recentReads");

    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    // Format for app consumption
    const formatted = (user.recentReads || [])
      .filter((r: any) => Boolean(r.chapter))
      .map((r: any) => ({
        content: r.chapter,
        readtill: String(r.readtill || "1"),
        total: String(r.total || "1"),
        readAt: r.readAt ? new Date(r.readAt).toISOString() : new Date().toISOString(),
      }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error("GET recent-reads error:", error);
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const email = await getEmailFromRequest(req);
    if (!email) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { chapterId, readtill, total } = await req.json();
    if (!chapterId) {
      return NextResponse.json({ success: false, message: "chapterId is required" }, { status: 400 });
    }

    await connectMongo();
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    const rawList: any[] = user.recentReads || [];
    // Filter out existing entry for this chapter
    const filtered = rawList.filter(
      (item: any) => String(item.chapter?._id || item.chapter) !== String(chapterId)
    );

    // Unshift the newly updated progress
    filtered.unshift({
      chapter: chapterId,
      readtill: String(readtill || "1"),
      total: String(total || "1"),
      readAt: new Date(),
    });

    // Cap at 50 recent items
    user.recentReads = filtered.slice(0, 50);
    await user.save();

    return NextResponse.json({ success: true, message: "Progress saved" });
  } catch (error: any) {
    console.error("POST recent-reads error:", error);
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}
