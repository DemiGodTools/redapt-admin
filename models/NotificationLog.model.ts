import { Schema, model, models } from "mongoose";

export interface INotificationLog {
  title: string;
  body: string;
  imageUrl?: string;
  targetScreen?: string;
  dataPayload?: Record<string, string>;
  topic: string;
  status: "SENT" | "FAILED";
  messageId?: string;
  errorMessage?: string;
  sentAt: Date;
}

const NotificationLogSchema = new Schema<INotificationLog>(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
    imageUrl: { type: String, default: "" },
    targetScreen: { type: String, default: "Home" },
    dataPayload: { type: Schema.Types.Mixed, default: {} },
    topic: { type: String, default: "all_users" },
    status: { type: String, enum: ["SENT", "FAILED"], default: "SENT" },
    messageId: { type: String, default: "" },
    errorMessage: { type: String, default: "" },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

NotificationLogSchema.index({ sentAt: -1 });

export const NotificationLog =
  models.NotificationLog ||
  model<INotificationLog>("NotificationLog", NotificationLogSchema);
