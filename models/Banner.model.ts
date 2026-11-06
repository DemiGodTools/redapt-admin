import mongoose, { Schema, model, models } from "mongoose";

export interface IBanner {
  _id: string;
  title: string;
  subtitle?: string;
  image: string; // 3:4 aspect ratio image URL
  type: "custom" | "series" | "chapter";
  redirectionType: "none" | "series" | "chapter" | "screen" | "page" | string;
  targetId?: string | null;
  targetModel?: "Series" | "Chapter" | "Screen" | string | null;
  targetScreen?: string | null;
  series?: mongoose.Types.ObjectId | null;
  chapter?: mongoose.Types.ObjectId | null;
  author?: string;
  category?: string;
  order?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const BannerSchema = new Schema<IBanner>(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: "", trim: true },
    image: { type: String, required: true, trim: true },
    type: { type: String, enum: ["custom", "series", "chapter"], default: "custom" },
    redirectionType: {
      type: String,
      enum: [
        "none",
        "series",
        "chapter",
        "screen",
        "page",
        "downloads",
        "trending",
        "subscription",
        "upgrade",
        "profile",
        "liked",
        "recent_reads",
      ],
      default: "none",
    },
    targetId: { type: String, default: null },
    targetModel: { type: String, default: null },
    targetScreen: { type: String, default: null },
    series: { type: Schema.Types.ObjectId, ref: "Series", default: null },
    chapter: { type: Schema.Types.ObjectId, ref: "Chapter", default: null },
    author: { type: String, default: "Readapt Curators", trim: true },
    category: { type: String, default: "Spotlight", trim: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Banner = models.Banner || model<IBanner>("Banner", BannerSchema);
export default Banner;

