// File: models/TeamMember.model.ts
import { Schema, model, models } from "mongoose";

// Access level ka strict schema (restrict, view, edit)
const accessSchema = new Schema({
  dashboard: { type: String, enum: ["restrict", "view", "edit"], default: "restrict" },
  categories: { type: String, enum: ["restrict", "view", "edit"], default: "restrict" },
  series: { type: String, enum: ["restrict", "view", "edit"], default: "restrict" },
  chapters: { type: String, enum: ["restrict", "view", "edit"], default: "restrict" },
  qna: { type: String, enum: ["restrict", "view", "edit"], default: "restrict" },
  banners: { type: String, enum: ["restrict", "view", "edit"], default: "restrict" },
}, { _id: false });

const TeamMemberSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { 
      type: String, 
      required: true, 
      unique: true, 
      lowercase: true, 
      trim: true 
    },
    // Password DB mein humesha encrypted/hashed rahega
    password: { type: String, required: true, select: false },
    access: { type: accessSchema, required: true },
    role: { type: String, default: "team_member" }
  },
  { timestamps: true }
);

export const TeamMember = models.TeamMember || model("TeamMember", TeamMemberSchema);