import { Types } from "mongoose";
import { MediaType, SubscriptionPlan } from "../enums";

export interface IChapter {
  _id: Types.ObjectId;
  title: string;
  details?: string;
  media: string; // URL
  type: MediaType;
  for: SubscriptionPlan;
  isTrending: boolean;
  comments: Types.ObjectId[];
  questions?: Types.ObjectId[];
  cover?: string;
  category: Types.ObjectId;
  subCategory?: Types.ObjectId | null;
  series?: Types.ObjectId;
  likes: number;
  author: string;
  total: number;
  isDownloadable: boolean;
  toc: {
    cut: string;
    title: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}