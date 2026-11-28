import { Types } from "mongoose";

export interface IComment {
  _id: Types.ObjectId;
  by?: Types.ObjectId;
  targetId?: Types.ObjectId;
  targetType?: "chapter" | "qna" | "question";
  userEmail?: string;
  userName?: string;
  userHandle?: string;
  userImage?: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}
