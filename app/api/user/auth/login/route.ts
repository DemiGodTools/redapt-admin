import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectMongo from "@/lib/connectMongo";
import { User } from "@/models/User.model";

interface GoogleTokenInfo {
  email?: string;
  name?: string;
  picture?: string;
  sub?: string;
  error_description?: string;
}

export async function POST(req: Request) {
  try {
    const { googleAccessToken, idToken } = await req.json();

    const tokenToVerify = idToken || googleAccessToken;

    if (!tokenToVerify) {
      return NextResponse.json(
        { success: false, message: "Missing Google token" },
        { status: 400 }
      );
    }

    let email: string | undefined;
    let name: string | undefined;
    let picture: string | undefined;

    // 1. Verify token with Google's OAuth2 tokeninfo endpoint
    if (idToken) {
      const googleRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
      );
      const data: GoogleTokenInfo = await googleRes.json();

      if (!googleRes.ok || !data.email) {
        return NextResponse.json(
          { success: false, message: "Invalid or expired Google ID token" },
          { status: 401 }
        );
      }

      email = data.email;
      name = data.name;
      picture = data.picture;
    } else {
      // Fallback: Verify access token via userinfo endpoint
      const userInfoRes = await fetch(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
          headers: {
            Authorization: `Bearer ${googleAccessToken}`,
          },
        }
      );

      if (!userInfoRes.ok) {
        return NextResponse.json(
          { success: false, message: "Failed to fetch Google user info" },
          { status: 401 }
        );
      }

      const googleUser: GoogleTokenInfo = await userInfoRes.json();
      email = googleUser.email;
      name = googleUser.name;
      picture = googleUser.picture;
    }

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email not provided by Google account" },
        { status: 400 }
      );
    }

    // 2. Connect DB & Find/Create User
    await connectMongo();

    let user = await User.findOne({ email });

if (user && user.subscription?.plan > 0 && user.subscription?.expiresOn) {
  const expiryMs = new Date(user.subscription.expiresOn).getTime();
  if (!isNaN(expiryMs) && expiryMs <= Date.now()) {
    user.subscription.plan = 0;
    await user.save();
  }
}

    if (!user) {
      const baseId = email.split("@")[0];
      const cleaned = baseId.replace(/[^a-zA-Z]/g, "");
      const userId = cleaned || `user${Date.now()}`;

      user = await User.create({
        email,
        name: name || baseId,
        userId,
        image: picture,
      });
    }

    // 3. Issue internal JWT
    const jwtSecret =
      process.env.JWT_SECRET ||
      process.env.NEXTAUTH_SECRET ||
      "readapt_super_secret_jwt_key_12345";

    const token = jwt.sign(
      {
        _id: user._id,
        email: user.email,
        userId: user.userId || user._id?.toString() || "user",
      },
      jwtSecret.trim(),
      { expiresIn: "30d" }
    );

    return NextResponse.json({
      success: true,
      token,
      expiry: Date.now() + 1000 * 60 * 60 * 24 * 30,
      user,
    });
  } catch (error) {
    console.error("Google Login Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
