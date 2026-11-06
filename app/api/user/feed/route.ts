import { NextRequest, NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { Types } from "mongoose";
import { User } from "@/models/User.model";
import { Chapter } from "@/models/Chapter.model";
import "@/models/Category.model";
import "@/models/Series.model";
import { Series } from "@/models/Series.model";
import { Thought } from "@/models/Thought.model";
import { Banner } from "@/models/Banner.model";
import { jwtVerify } from "jose";
import { IS_EARLY_ACCESS_FREE } from "@/lib/verifyUserEntitlement";

export async function GET(req: NextRequest) {
  try {
    await connectMongo();

    let email = req.headers.get("x-user-email");
    if (!email) {
      const authHeader =
        req.headers.get("authorization") || req.headers.get("Authorization");
      if (authHeader) {
        const parts = authHeader.split(" ");
        if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
          const token = parts[1];
          try {
            const rawSecret =
              process.env.JWT_SECRET ||
              process.env.NEXTAUTH_SECRET ||
              "readapt_super_secret_jwt_key_12345";
            const secret = new TextEncoder().encode(rawSecret);
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

    const series = await Series.find({}).lean();

    const seriesChapterIds = new Set<string>();
    series.forEach((s: any) => {
      if (Array.isArray(s?.chapters)) {
        s.chapters.forEach((chObj: any) => {
          const cId = chObj?.content?._id || chObj?.content || chObj?._id;
          if (cId) seriesChapterIds.add(String(cId));
        });
      }
    });

    const seriesChapterObjectIds = Array.from(seriesChapterIds)
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    const standaloneMatch = {
      $and: [
        { $or: [{ series: null }, { series: { $exists: false } }] },
        ...(seriesChapterObjectIds.length > 0 ? [{ _id: { $nin: seriesChapterObjectIds } }] : []),
      ],
    };

    const trendingChapters = await Chapter.find({
      isTrending: true,
      ...standaloneMatch,
    })
      .sort({ likes: -1, updatedAt: -1 })
      .limit(30)
      .populate("category")
      .lean();

    const userPlan = IS_EARLY_ACCESS_FREE ? 3 : ((user as any)?.subscription?.plan ?? 0);

    const available = await Chapter.find({
      for: { $lte: userPlan },
      ...standaloneMatch,
    })
      .sort({ updatedAt: -1 })
      .limit(10);

    const thought = await Thought.findOne({}).sort({ updatedAt: -1 }).lean();

    // ⚡ 1. Fetch Dynamic Custom Banners from Banner Manager
    let customBanners: any[] = [];
    try {
      customBanners = await Banner.find({ isActive: true })
        .sort({ order: 1, createdAt: -1 })
        .populate("series")
        .populate("chapter")
        .lean();
    } catch (bannerErr) {
      console.warn("Failed to query custom banners:", bannerErr);
    }

    // ⚡ 2. Curated high-impact banners in exact 3:4 format expected by BannerSlider.tsx
    const banners = customBanners.length > 0
      ? customBanners.map((b: any) => {
          let bannerType = "standalone_book";
          if (b.type === "series" || b.redirectionType === "series") {
            bannerType = "series";
          } else if (
            b.redirectionType === "screen" ||
            b.redirectionType === "page" ||
            b.targetModel === "Screen" ||
            [
              "downloads",
              "trending",
              "subscription",
              "upgrade",
              "profile",
              "liked",
              "recent_reads",
            ].includes(b.redirectionType)
          ) {
            bannerType = "screen";
          } else if (b.type === "custom" && (b.redirectionType === "none" || !b.redirectionType)) {
            bannerType = "announcement";
          } else if (b.redirectionType === "chapter" || b.type === "chapter") {
            bannerType = "standalone_book";
          }

          const targetScreen =
            b.targetScreen ||
            (
              [
                "downloads",
                "trending",
                "subscription",
                "upgrade",
                "profile",
                "liked",
                "recent_reads",
              ].includes(b.redirectionType)
                ? b.redirectionType
                : b.targetModel === "Screen"
                ? b.targetId
                : null
            );

          const targetId =
            b.targetId ||
            (b.series?._id ? String(b.series._id) : null) ||
            (b.chapter?._id ? String(b.chapter._id) : null) ||
            targetScreen ||
            String(b._id);

          return {
            _id: String(b._id),
            bannerId: String(b._id),
            id: String(b._id),
            bannerType,
            redirectionType: b.redirectionType,
            targetId: targetId ? String(targetId) : null,
            targetModel:
              b.targetModel ||
              (bannerType === "series"
                ? "Series"
                : bannerType === "standalone_book"
                ? "Chapter"
                : bannerType === "screen"
                ? "Screen"
                : null),
            targetScreen: targetScreen ? String(targetScreen) : null,
            title: b.title,
            subText:
              b.subtitle ||
              (b.type === "series"
                ? `${b.series?.chapters?.length || 0} Chapters • Curated Series`
                : b.author
                ? `By ${b.author}`
                : "Readapt Curators"),
            subtitle: b.subtitle || "",
            author: b.author || b.chapter?.author || b.series?.author || "Readapt Curators",
            cover: b.image,
            image: b.image,
            category:
              b.category ||
              b.chapter?.category?.name ||
              b.series?.category?.name ||
              "Spotlight",
            type: b.type === "series" ? "series" : (b.chapter?.type || "book"),
            for: b.chapter?.for ?? b.series?.for ?? 0,
            isFramework: Boolean(b.series?.type === "framework"),
            action:
              b.redirectionType === "none"
                ? "toast"
                : targetScreen || undefined,
          };
        })
      : (() => {
          const seriesChapterIds = new Set<string>();
          series.forEach((s: any) => {
            if (Array.isArray(s?.chapters)) {
              s.chapters.forEach((chObj: any) => {
                const cId = chObj?.content?._id || chObj?.content || chObj?._id;
                if (cId) seriesChapterIds.add(String(cId));
              });
            }
          });

          const standaloneTrending = trendingChapters.filter(
            (ch: any) => !seriesChapterIds.has(String(ch._id)) && !ch.series
          );

          if (standaloneTrending.length > 0) {
            return standaloneTrending.slice(0, 6).map((ch: any) => ({
              ...ch,
              bannerType: "standalone_book",
              redirectionType: "chapter",
              targetId: String(ch._id),
              targetModel: "Chapter",
              cover: ch.cover || ch.image,
              image: ch.cover || ch.image,
              subText: `By ${ch.author || "Readapt Curators"}`,
            }));
          }

          const standalonePersonalized = personalizedChapters.filter(
            (ch: any) => !seriesChapterIds.has(String(ch._id)) && !ch.series
          );

          return standalonePersonalized.slice(0, 6).map((ch: any) => ({
            ...ch,
            bannerType: "standalone_book",
            redirectionType: "chapter",
            targetId: String(ch._id),
            targetModel: "Chapter",
            cover: ch.cover || ch.image,
            image: ch.cover || ch.image,
            subText: `By ${ch.author || "Readapt Curators"}`,
          }));
        })();

    return NextResponse.json({
      success: true,
      data: {
        banners,
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
