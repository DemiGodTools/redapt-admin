import { NextResponse } from "next/server";
import { Thought } from "@/models/Thought.model";
import connectMongo from "@/lib/connectMongo";
import { verifyJWT } from "@/middleware";

interface ThoughtBody {
  title: string;
  desc: string;
}

export async function GET() {
  try {
    await connectMongo();
    const thought = await Thought.findOne({}).sort({ updatedAt: -1 }).lean();
    return NextResponse.json({
      success: true,
      data: thought || null,
    });
  } catch (err: any) {
    console.error("Get Admin Thought Error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    // ⚡ RBAC Check
    const token =
      (req as any).cookies?.get("adminToken")?.value ||
      req.headers.get("cookie")?.split("adminToken=")[1]?.split(";")[0];

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized admin" },
        { status: 401 }
      );
    }

    const payload = await verifyJWT(token);

    // Check if team member and dashboard access is NOT edit
    if (payload?.role === "team_member" && payload.access?.dashboard !== "edit") {
      return NextResponse.json(
        {
          success: false,
          errorType: "RBAC",
          message: "Access Denied: You need edit access for the dashboard to post thoughts.",
        },
        { status: 403 }
      );
    }

    await connectMongo();

    const body = (await req.json()) as ThoughtBody;
    const { title, desc } = body;

    // Basic validation
    if (!title || desc === undefined) {
      return NextResponse.json(
        { success: false, message: "title and desc are required" },
        { status: 400 }
      );
    }

    const existingThought = await Thought.findOne({}).sort({ updatedAt: -1 });

    let newThought;
    if (existingThought) {
      newThought = await Thought.findByIdAndUpdate(
        existingThought._id,
        { title: title.trim(), desc: desc.trim() },
        { new: true }
      );
    } else {
      newThought = await Thought.create({
        title: title.trim(),
        desc: desc.trim(),
      });
    }

    return NextResponse.json({
      success: true,
      data: newThought,
    });
  } catch (err: any) {
    console.error("Update Thought Error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
