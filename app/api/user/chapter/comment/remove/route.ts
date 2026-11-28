import { NextRequest } from "next/server";
import { handleDeleteComment } from "@/lib/commentService";

export async function POST(req: NextRequest) {
  return handleDeleteComment(req);
}

export async function DELETE(req: NextRequest) {
  return handleDeleteComment(req);
}
