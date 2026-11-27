import { NextRequest, NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import { User } from "@/models/User.model";
import { getAuthenticatedUser } from "@/lib/userAuth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    const email = authUser?.email || null;

    if (!email) {
      return NextResponse.json({ success: false, message: "Missing session" }, { status: 401 });
    }

    await connectMongo();
    await User.collection.updateOne(
      { email },
      {
        $set: {
          isLoggedIn: true,
          lastActiveAt: new Date(),
        },
      }
    );

    return NextResponse.json({ success: true, timestamp: Date.now() });
  } catch {
    return NextResponse.json({ success: true });
  }
}
