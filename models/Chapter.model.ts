// File: models/Chapter.model.ts
import { Schema, model, models } from "mongoose";
import { MediaType, SubscriptionPlan } from "../enums";
import { IChapter } from "@/types/Chapter";

const numericSubscriptionPlans = Object.values(SubscriptionPlan).filter(
  (v): v is number => typeof v === "number"
);

const ChapterSchema = new Schema<IChapter>(
  {
    title: { type: String, required: true },
    details: { type: String, required: true },
    media: { type: String, required: true },
    type: {
      type: String,
      enum: Object.values(MediaType),
      default: MediaType.PDF,
    },
    for: {
      type: Number,
      enum: numericSubscriptionPlans,
      default: SubscriptionPlan.FREE,
    },
    isTrending: { type: Boolean, default: false },
    comments: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
    qnaComments: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
    questions: [{ type: Schema.Types.ObjectId, ref: "Question", default: [] }],
    cover: { type: String, required: true },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    subCategory: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },
    series: {
      type: Schema.Types.ObjectId,
      ref: "Series",
      default: null,
      index: true,
    },
    likes: { type: Number, default: 0 },
    author: { type: String, required: true },
    isDownloadable: { type: Boolean, default: true },
    isProtected: { type: Boolean, default: true }, // ⚡ Screenshot Protection Flag
    toc: [
      {
        _id: false,
        cut: { type: String, required: true },
        title: { type: String, required: true },
      },
    ],
    transcript: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Chapter =
  models.Chapter || model<IChapter>("Chapter", ChapterSchema);