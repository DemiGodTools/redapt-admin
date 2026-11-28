// File: app/api/user/chapter/comment/add/route.ts
import { handlePostComment } from "@/lib/commentService";

export async function POST(req: Request) {
  return handlePostComment(req);
}
