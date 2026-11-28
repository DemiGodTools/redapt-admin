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
    clientRequestId: { type: String, required: false, trim: true, maxlength: 80 },
    userEmail: { type: String, index: true },
    userName: { type: String },
    userHandle: { type: String },
    userImage: { type: String },
    text: { type: String, required: true, maxlength: 500 },
  },
  { timestamps: true }
);

// Primary index for O(limit) cursor-based comment pagination at million-row scale
CommentSchema.index({ targetId: 1, targetType: 1, _id: -1 });
// Idempotency key to prevent duplicate posts on transient network retries
CommentSchema.index(
  { by: 1, clientRequestId: 1 },
  { unique: true, sparse: true }
);

export const Comment =
  models.Comment || model<IComment>("Comment", CommentSchema);
