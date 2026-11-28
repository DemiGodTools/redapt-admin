import { Types } from "mongoose";

export interface IQuestion {
  _id: Types.ObjectId;
  question: string;
  options: string[];
  correct: number; // index
  explanation?: string;
  comments: Types.ObjectId[];
  commentsCount?: number;
  createdAt: Date;
  updatedAt: Date;
}
