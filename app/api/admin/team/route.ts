// File: app/api/admin/team/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import bcrypt from "bcryptjs";
import connectMongo from "@/lib/connectMongo";
import { TeamMember } from "@/models/TeamMember.model";

// 1. GET: Saare team members fetch karne ke liye
export async function GET() {
  try {
    await connectMongo();
    // Password select nahi kar rahe security ke liye
    const members = await TeamMember.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: members });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// 2. POST: Naya team member add karne ke liye
export async function POST(req: NextRequest) {
  try {
    await connectMongo();
    const { name, email, password, access } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ success: false, message: "Name, email, and password are required" }, { status: 400 });
    }

    const existingMember = await TeamMember.findOne({ email });
    if (existingMember) {
      return NextResponse.json({ success: false, message: "A member with this email already exists" }, { status: 400 });
    }

    // Password ko bcrypt se hash/encrypt kar rahe hain
    const hashedPassword = await bcrypt.hash(password, 10);

    const newMember = await TeamMember.create({
      name,
      email,
      password: hashedPassword,
      access
    });

    return NextResponse.json({ success: true, message: "Team member added successfully!", data: newMember }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// 3. PUT: Existing team member ki details/access edit karne ke liye
export async function PUT(req: NextRequest) {
  try {
    await connectMongo();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id || !Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid Member ID" }, { status: 400 });
    }

    const { name, email, password, access } = await req.json();
    const updateData: any = { name, email, access };

    // Agar owner ne naya password type kiya hai, toh usko dobara hash karke save karo
    if (password && password.trim() !== "") {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedMember = await TeamMember.findByIdAndUpdate(id, { $set: updateData }, { new: true });
    return NextResponse.json({ success: true, message: "Team member updated successfully!", data: updatedMember });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// 4. DELETE: Team member ko remove karne ke liye
export async function DELETE(req: NextRequest) {
  try {
    await connectMongo();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id || !Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid Member ID" }, { status: 400 });
    }

    await TeamMember.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "Team member removed successfully!" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}