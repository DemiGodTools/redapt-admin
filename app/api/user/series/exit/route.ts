import { NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { User } from "@/models/User.model";
import { Series } from "@/models/Series.model";
import { getAuthenticatedUser } from "@/lib/userAuth";
import { Types } from "mongoose";

export async function POST(req: Request) {
  try {
    const authUser = await getAuthenticatedUser(req);
    const userEmail = authUser?.email;
    const userIdFromToken = authUser?.userId;

    if (!userEmail && !userIdFromToken) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: valid session token required" },
        { status: 401 }
      );
    }

    await connectMongo();

    let user = null;
    if (userEmail) {
      user = await User.findOne({ email: userEmail });
    }
    if (!user && userIdFromToken && Types.ObjectId.isValid(userIdFromToken)) {
      user = await User.findById(userIdFromToken);
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    if (user.joinedSeries) {
      await Series.updateOne(
        { _id: user.joinedSeries },
        { $pull: { joinedBy: user._id } }
      );
    }

    user.joinedSeries = null;
    await user.save();
    return NextResponse.json({ success: true, user }, { status: 200 });
  } catch (error) {
    console.error("EXIT SERIES ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
