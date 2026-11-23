import { NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { User } from "@/models/User.model";
import { Chapter } from "@/models/Chapter.model";
import { Types } from "mongoose";
import { getVerifiedUserAndEntitlement } from "@/lib/verifyUserEntitlement";

interface LikeChapterBody {
  chapterId: string;
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

    let updatedLikesCount = 0;

    if (alreadyLiked) {
      // 1. Remove from user likes
      await User.updateOne(
        { _id: user._id },
        { $pull: { likes: chapterId } }
      );

      // 2. Decrement chapter likes count (floor at 0)
      let updatedDoc = await Chapter.findOneAndUpdate(
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

      updatedLikesCount = Number(updatedDoc?.likes) || 0;

      return NextResponse.json({
        success: true,
        liked: false,
        likes: updatedLikesCount,
        message: "Chapter unliked",
      });
    } else {
      // 1. Add to user likes
      await User.updateOne(
        { _id: user._id },
        { $addToSet: { likes: chapterId } }
      );

      // 2. Increment chapter likes count
      const updatedDoc = await Chapter.findByIdAndUpdate(
        chapterId,
        { $inc: { likes: 1 } },
        { new: true }
      );

      updatedLikesCount = Number(updatedDoc?.likes) || 1;

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
