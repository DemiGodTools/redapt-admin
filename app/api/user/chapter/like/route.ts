import { NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { User } from "@/models/User.model";
import { Chapter } from "@/models/Chapter.model";
import { Types } from "mongoose";
import { getVerifiedUserAndEntitlement } from "@/lib/verifyUserEntitlement";

interface LikeChapterBody {
  chapterId: string;
  desiredLiked?: boolean;
}

export async function POST(req: Request) {
  try {
    await connectMongo();

    const { user } = await getVerifiedUserAndEntitlement(req);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Invalid or missing session" },
        { status: 401 }
      );
    }

    const body = (await req.json()) as LikeChapterBody;

    if (!body?.chapterId || !Types.ObjectId.isValid(body.chapterId)) {
      return NextResponse.json(
        { success: false, message: "Valid chapterId is required" },
        { status: 400 }
      );
    }

    const chapterId = new Types.ObjectId(body.chapterId);

    if (!Array.isArray(user.likes)) {
      user.likes = [];
    }

    const alreadyLiked = user.likes.some(
      (id: any) => id?.toString() === chapterId.toString()
    );

    // Prefer explicit desiredLiked from idempotent clients; fall back to toggle for legacy builds.
    const targetLiked =
      typeof body?.desiredLiked === "boolean" ? body.desiredLiked : !alreadyLiked;

    let updatedLikesCount = 0;

    if (!targetLiked) {
      // Atomic pull: only decrement Chapter.likes if this user actually had it liked
      const pullRes = await User.updateOne(
        { _id: user._id, likes: chapterId },
        { $pull: { likes: chapterId } }
      );

      let updatedDoc;
      if (pullRes.modifiedCount > 0) {
        updatedDoc = await Chapter.findOneAndUpdate(
          { _id: chapterId, likes: { $gt: 0 } },
          { $inc: { likes: -1 } },
          { new: true }
        );
        if (!updatedDoc) {
          updatedDoc = await Chapter.findByIdAndUpdate(
            chapterId,
            { $set: { likes: 0 } },
            { new: true }
          );
        }
      } else {
        updatedDoc = await Chapter.findById(chapterId);
      }

      updatedLikesCount = Math.max(0, Number(updatedDoc?.likes) || 0);

      return NextResponse.json({
        success: true,
        liked: false,
        likes: updatedLikesCount,
        message: "Chapter unliked",
      });
    } else {
      // Atomic add: only increment Chapter.likes if chapterId was NOT already in user.likes
      const addRes = await User.updateOne(
        { _id: user._id, likes: { $ne: chapterId } },
        { $addToSet: { likes: chapterId } }
      );

      const updatedDoc =
        addRes.modifiedCount > 0
          ? await Chapter.findByIdAndUpdate(
              chapterId,
              { $inc: { likes: 1 } },
              { new: true }
            )
          : await Chapter.findById(chapterId);

      updatedLikesCount = Math.max(0, Number(updatedDoc?.likes) || 1);

      return NextResponse.json({
        success: true,
        liked: true,
        likes: updatedLikesCount,
        message: "Chapter liked",
      });
    }
  } catch (error) {
    console.error("LIKE CHAPTER ERROR:", error);
    return NextResponse.json(
      { success: false, message: (error as any)?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
