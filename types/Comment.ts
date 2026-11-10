import { Types } from "mongoose";

export interface IComment {
  _id: Types.ObjectId;
  by?: Types.ObjectId;
  userEmail?: string;
  userName?: string;
  userHandle?: string;
  userImage?: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}
