import { NextRequest, NextResponse } from "next/server";
import connectMongo from "@/lib/connectMongo";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { TeamMember } from "@/models/TeamMember.model";

const generateTeamToken = async (member: any): Promise<string> => {
  const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "readapt_super_secret_jwt_key_12345";
  const secret = new TextEncoder().encode(jwtSecret.trim());

  return await new SignJWT({
    userId: member._id.toString(),
    email: member.email,
    role: member.role,
    name: member.name,
    access: member.access // ⚡ Yahan permissions JWT mein pack ho rahi hain
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
};

export async function POST(req: NextRequest) {
  try {
    await connectMongo();
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ success: false, message: "Email and password are required." }, { status: 400 });
    }

    // Password nikalne ke liye explicitly +password select karna padega
    const member = await TeamMember.findOne({ email }).select("+password").lean();

    if (!member) {
      return NextResponse.json({ success: false, message: "Team member not found." }, { status: 404 });
    }

    const validPassword = await bcrypt.compare(password, member.password);
    if (!validPassword) {
      return NextResponse.json({ success: false, message: "Invalid email or password." }, { status: 401 });
    }

    const token = await generateTeamToken(member);

    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      name: member.name,
      role: member.role,
      access: member.access
    });

    // Same cookie jo master admin use karta hai
    response.cookies.set("adminToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Team Login Error:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}