import { IComment } from "@/types/Comment";
import { Schema, model, models } from "mongoose";

const CommentSchema = new Schema<IComment>(
  {
    by: { type: Schema.Types.ObjectId, ref: "User", required: false, index: true },
    targetId: { type: Schema.Types.ObjectId, required: false },
    targetType: {
      type: String,
      enum: ["chapter", "qna", "question"],
      required: false,
    },
    userEmail: { type: String, index: true },
    userName: { type: String },
    userHandle: { type: String },
    userImage: { type: String },
    text: { type: String, required: true, maxlength: 500 },
  },
  { timestamps: true }
);

CommentSchema.index({ targetId: 1, targetType: 1, createdAt: -1 });

export const Comment =
  models.Comment || model<IComment>("Comment", CommentSchema);
