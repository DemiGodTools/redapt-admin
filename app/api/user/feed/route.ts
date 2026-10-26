import { NextRequest, NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { Types } from "mongoose";
import { User } from "@/models/User.model";
import { Chapter } from "@/models/Chapter.model";
import "@/models/Category.model";
import "@/models/Series.model";
import { Series } from "@/models/Series.model";
import { Thought } from "@/models/Thought.model";
import { jwtVerify } from "jose";

export async function GET(req: NextRequest) {
  try {
    await connectMongo();

    let email = req.headers.get("x-user-email");
    if (!email) {
      const authHeader =
        req.headers.get("authorization") || req.headers.get("Authorization");
      if (authHeader) {
        const token = authHeader.replace(/^Bearer\s+/i, "").trim();
        if (token && token !== "undefined" && token !== "null") {
          try {
            const rawSecret =
              process.env.JWT_SECRET ||
              process.env.NEXTAUTH_SECRET ||
              "readapt_super_secret_jwt_key_12345";
            const secret = new TextEncoder().encode(rawSecret.trim());
            const { payload } = await jwtVerify(token, secret);
            email = ((payload as any)?.email || (payload as any)?.user?.email || null) as string | null;
          } catch {}
        }
      }
    }

    const user = email ? await User.findOne({ email }).lean() : null;

    let topCategories: Types.ObjectId[] = [];

    if (user && Array.isArray((user as any).likes) && (user as any).likes.length) {
      const categoryAgg = await Chapter.aggregate([
        { $match: { _id: { $in: (user as any).likes } } },
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 3 },
      ]);

      topCategories = categoryAgg.map((c) => c._id);
    }

    let personalizedChapters = topCategories.length
      ? await Chapter.find({
          category: { $in: topCategories },
        })
          .sort({ updatedAt: -1 })
          .limit(10)
          .populate("category")
          .lean()
      : [];

    if (personalizedChapters.length < 10) {
      const needed = 10 - personalizedChapters.length;

      const existingIds = personalizedChapters.map((ch) => ch._id);

      const topLikedChapters = await Chapter.aggregate([
        {
          $match: {
            _id: { $nin: existingIds },
          },
        },
        { $sort: { likes: -1, updatedAt: -1 } },
        { $limit: needed },
      ]);

      if (topLikedChapters.length) {
        const populatedTopLiked = await Chapter.populate(topLikedChapters, {
          path: "category",
        });

        personalizedChapters = [...personalizedChapters, ...populatedTopLiked];
      }
    }

    const trendingChapters = await Chapter.find({
      isTrending: true,
    })
      .sort({ updatedAt: -1 })
      .limit(10)
      .populate("category")
      .lean();

    const series = await Series.find({}).lean();

    const userPlan = (user as any)?.subscription?.plan ?? 0;
    const available = await Chapter.find({
      for: { $lte: userPlan },
    })
      .sort({ updatedAt: -1 })
      .limit(10);

    const thought = await Thought.findOne({}).sort({ updatedAt: -1 }).lean();

    return NextResponse.json({
      success: true,
      data: {
        personalized: personalizedChapters,
        trending: trendingChapters,
        series,
        available,
        thought: thought || null,
      },
    });
  } catch (err: any) {
    console.error("Feed error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || String(err), stack: err?.stack },
      { status: 500 },
    );
  }
}
