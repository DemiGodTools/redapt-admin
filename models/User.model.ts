// models/user.model.ts
import { Schema, model, models } from "mongoose";
import { SubscriptionPlan } from "@/enums";
import { IUser } from "@/types/User";

const numericSubscriptionPlans = Object.values(SubscriptionPlan).filter(
  (v): v is number => typeof v === "number"
);

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    bio: { type: String, default: "", maxlength: 160 },
    profession: { type: String, default: "" },
    interests: [{ type: String }],
    visibility: {
      type: String,
      enum: ["Public", "Private"],
      default: "Public",
    },
    isProfileCompleted: { type: Boolean, default: false },
    usernameLastChangedAt: { type: Date, default: null },
    subscription: {
      plan: {
        type: Number,
        enum: numericSubscriptionPlans,
        default: SubscriptionPlan.FREE,
      },
      expiresOn: Date,
    },
    likes: [{ type: Schema.Types.ObjectId, ref: "Chapter" }],
    image: String,
    joinedSeries: { type: Schema.Types.ObjectId, ref: "Series" },
    profileLevel: { type: Number, default: 1 },
    questionsAttempted: [
      {
        question: { type: Schema.Types.ObjectId, ref: "Question" },
        answered: Number,
      },
    ],
    correctAnsStreak: { type: Number, default: 0 },
    streakData: {
      streak: { type: Number, default: 0 },
      lastDate: { type: String, default: "" },
    },
    recentReads: [
      {
        chapter: { type: Schema.Types.ObjectId, ref: "Chapter" },
        readtill: { type: String, default: "1" },
        total: { type: String, default: "1" },
        readAt: { type: Date, default: Date.now },
      },
    ],
    deletionStatus: {
      type: String,
      enum: ["ACTIVE", "PENDING_DELETION"],
      default: "ACTIVE",
    },
    deletionScheduledAt: {
      type: Date,
      default: null,
    },
    deletionToken: {
      type: String,
      default: null,
      index: true,
    },
    isLoggedIn: {
      type: Boolean,
      default: false,
      index: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    lastLogoutAt: {
      type: Date,
      default: null,
    },
    lastActiveAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true, strict: false }
);

export const User =
  models.User || model<IUser>("User", UserSchema);
