import { Schema, model, models } from "mongoose";
import { SubscriptionPlan } from "../enums";
import { ISeries } from "@/types/Series";
import { Question } from "@/models/Question.model";
import { Category } from "@/models/Category.model";

const numericSubscriptionPlans = Object.values(SubscriptionPlan).filter(
  (v): v is number => typeof v === "number"
);

const SeriesSchema = new Schema<ISeries>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    joinedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    chapters: [
      {
        content: {
          type: Schema.Types.ObjectId,
          required: true,
          refPath: "chapters.contentModel",
        },
        contentModel: {
          type: String,
          required: true,
          enum: ["Chapter", "Question"],
        },
        order: { type: Number, required: true },
      },
    ],
    for: {
      type: Number,
      enum: numericSubscriptionPlans,
      default: SubscriptionPlan.FREE,
    },
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
    type: { type: String, default: "normal" },
    author: { type: String, default: "" },
    fee: { type: Number, default: 0 },
    recommendationBookId: {
      type: Schema.Types.ObjectId,
      ref: "Chapter",
      default: null,
    },
    recommendationText: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Series =
  models.Series || model<ISeries>("Series", SeriesSchema);