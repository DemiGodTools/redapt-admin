import mongoose, { Schema, Document } from "mongoose";

export interface IDailyBandwidthItem {
  key: string;
  category: string;
  bytes: number;
  hits: number;
  lastAccessed: Date;
}

export interface IDailyBandwidth extends Document {
  date: string; // "YYYY-MM-DD" (UTC Date string)
  totalBytes: number;
  totalRequests: number;
  breakdown: {
    audio: { bytes: number; hits: number };
    pdf: { bytes: number; hits: number };
    image: { bytes: number; hits: number };
    other: { bytes: number; hits: number };
  };
  items: IDailyBandwidthItem[];
  createdAt: Date;
  updatedAt: Date;
}

const DailyBandwidthSchema = new Schema<IDailyBandwidth>(
  {
    date: { type: String, required: true, unique: true, index: true },
    totalBytes: { type: Number, default: 0 },
    totalRequests: { type: Number, default: 0 },
    breakdown: {
      audio: {
        bytes: { type: Number, default: 0 },
        hits: { type: Number, default: 0 },
      },
      pdf: {
        bytes: { type: Number, default: 0 },
        hits: { type: Number, default: 0 },
      },
      image: {
        bytes: { type: Number, default: 0 },
        hits: { type: Number, default: 0 },
      },
      other: {
        bytes: { type: Number, default: 0 },
        hits: { type: Number, default: 0 },
      },
    },
    items: [
      {
        key: { type: String },
        category: { type: String },
        bytes: { type: Number, default: 0 },
        hits: { type: Number, default: 0 },
        lastAccessed: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export const DailyBandwidth =
  mongoose.models.DailyBandwidth ||
  mongoose.model<IDailyBandwidth>("DailyBandwidth", DailyBandwidthSchema);

