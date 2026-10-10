import { Types } from "mongoose";

export interface ICategory {
  _id: string;
  name: string;
  image: string;
  description?: string;
  parentCategory?: string | null;
  isFeatured?: boolean;
  order?: number;
  subCategories?: ICategory[];
  createdAt?: Date;
  updatedAt?: Date;
}