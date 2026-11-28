// File: app/api/user/chapter/comment/route.ts
import { NextRequest } from "next/server";
import {
  handleDeleteComment,
  handleGetComments,
  handlePostComment,
} from "@/lib/commentService";

export async function GET(req: NextRequest) {
  return handleGetComments(req);
}

export async function POST(req: NextRequest) {
  return handlePostComment(req);
}

export async function DELETE(req: NextRequest) {
  return handleDeleteComment(req);
}
