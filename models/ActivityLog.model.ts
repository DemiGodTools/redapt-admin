import { Schema, model, models } from "mongoose";

export interface IActivityLog {
  action: string;
  category: "content" | "banner" | "qna" | "auth" | "general";
  title: string;
  description: string;
  performedBy: string;
  performedByRole: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    action: { type: String, required: true, index: true },
    category: {
      type: String,
      enum: ["content", "banner", "qna", "auth", "general"],
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    performedBy: { type: String, default: "Master Admin" },
    performedByRole: { type: String, default: "admin" },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

ActivityLogSchema.index({ createdAt: -1 });
ActivityLogSchema.index({ category: 1, createdAt: -1 });

export const ActivityLog =
  models.ActivityLog || model<IActivityLog>("ActivityLog", ActivityLogSchema);

