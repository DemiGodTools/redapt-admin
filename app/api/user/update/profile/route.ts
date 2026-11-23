import { NextRequest, NextResponse } from "next/server";
import { uploadBufferToB2 } from "@/lib/b2";
import { User } from "@/models/User.model";
import connectMongo from "@/lib/connectMongo";
import { getAuthenticatedUser } from "@/lib/userAuth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser?.email) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: valid session token required" },
        { status: 401 }
      );
    }
    const userEmail = authUser.email;

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const publicUrl = await uploadBufferToB2(
      buffer,
      file.name,
      file.type || "image/jpeg",
      "profiles"
    );

    await connectMongo();

    const user = await User.findOneAndUpdate(
      { email: userEmail },
      { $set: { image: publicUrl } },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      url: publicUrl,
      user,
    });
  } catch (error: any) {
    console.error("Profile image upload error:", error);
    return NextResponse.json({ error: error?.message || "Upload failed" }, { status: 500 });
  }
}
