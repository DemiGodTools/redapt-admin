import { ICategory } from "@/types/Category";
import mongoose, { Schema, model, models } from "mongoose";

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    image: { type: String, default: "" },
    description: { type: String, default: "" },
    parentCategory: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    isFeatured: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Prevent model overwrite crash
export const Category =
  models.Category || model<ICategory>("Category", CategorySchema);

export default Category;