import { SubscriptionPlan } from "@/enums";
import { Types } from "mongoose";

export interface ISeriesContent {
  content: Types.ObjectId;
  contentModel: "Chapter" | "Question";
  order: number;
}

export interface ISeries {
  _id: Types.ObjectId;
  title: string;
  description: string;
  joinedBy: Types.ObjectId[];
  chapters: ISeriesContent[];
  for: SubscriptionPlan;
  cover: string;
  category: Types.ObjectId;
  subCategory?: Types.ObjectId | null;
  type?: string;
  author?: string;
  fee?: number;
  recommendationBookId?: any;
  recommendationText?: string;
  items?: ISeriesContent[];
  createdAt: Date;
  updatedAt: Date;
}