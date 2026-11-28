// models/question.model.ts
import { IQuestion } from "@/types/Question";
import { Schema, model, models } from "mongoose";

const QuestionSchema = new Schema<IQuestion>(
  {
    question: { type: String, required: true },
    options: {
      type: [String],
      validate: [
        (v: string[]) => v.length >= 2,
        "At least 2 options are required",
      ],
    },
    correct: { type: Number, min: 0, required: true },
    explanation: String,
    comments: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
    commentsCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

QuestionSchema.index({ comments: 1 });

export const Question =
  models.Question || model<IQuestion>("Question", QuestionSchema);
