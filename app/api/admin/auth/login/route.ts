import { NextRequest, NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { IAdmin } from "@/types/Admin";
import { Admin } from "@/models/Admin.model";

const generateToken = async (admin: IAdmin): Promise<string> => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is missing in environment");
  }
  const secret = new TextEncoder().encode(jwtSecret);

  return await new SignJWT({
    userId: admin._id.toString(),
    email: admin.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await connectMongo();

    const body = (await req.json()) as {
      email: string;
      password: string;
      secret: string;
    };

    const { email, password, secret } = body;

    if (!email || !password || !secret) {
      return NextResponse.json(
        { message: "improperly filled fields." },
        { status: 400 }
      );
    }

    const userSecret = (secret || "").trim();
    const expectedSecret = (process.env.ADMIN_SECRET || "").trim().replace(/^["']|["']$/g, "");

    if (!expectedSecret || userSecret !== expectedSecret) {
      return NextResponse.json(
        { message: "Invalid secret key." },
        { status: 403 }
      );
    }
    const admin = await Admin.findOne({ email })
      .select("+password")
      .lean<IAdmin>();

    if (!admin) {
      return NextResponse.json(
        { message: "Admin not found or unauthorized." },
        { status: 404 }
      );
    }

    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) {
      return NextResponse.json(
        { message: "Invalid email or password." },
        { status: 401 }
      );
    }

    const token = await generateToken(admin);

    const response = NextResponse.json({
      message: "Login successful! Redirecting... JWT: " + token,
    });

    response.cookies.set("adminToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
