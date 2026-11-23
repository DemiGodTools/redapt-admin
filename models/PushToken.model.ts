import { Schema, model, models } from "mongoose";

export interface IPushToken {
  token: string;
  type: "fcm" | "expo";
  platform?: "android" | "ios" | string;
  userId?: string;
  email?: string;
  subscribedToTopic: boolean;
  lastActiveAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const PushTokenSchema = new Schema<IPushToken>(
  {
    token: { type: String, required: true, unique: true, index: true },
    type: { type: String, enum: ["fcm", "expo"], default: "fcm" },
    platform: { type: String, default: "android" },
    userId: { type: String, default: null, index: true },
    email: { type: String, default: null, lowercase: true, trim: true },
    subscribedToTopic: { type: Boolean, default: false },
    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const PushToken =
  models.PushToken || model<IPushToken>("PushToken", PushTokenSchema);
