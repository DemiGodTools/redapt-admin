import { Types } from "mongoose";

interface IAttemptedQuestion {
  question: Types.ObjectId;
  answered: number;
}
import { SubscriptionPlan } from "@/enums";

export type DeletionStatus = "ACTIVE" | "PENDING_DELETION";

export interface IUser {
  _id: Types.ObjectId;
  email: string;
  name: string;
  userId: string;
  subscription: {
    plan: SubscriptionPlan;
    expiresOn?: Date | null;
  };
  likes: Types.ObjectId[];
  image?: string;
  joinedSeries?: Types.ObjectId;
  profileLevel: number;
  questionsAttempted: IAttemptedQuestion[];
  correctAnsStreak?: number;
  streakData?: {
    streak: number;
    lastDate: string;
  };
  recentReads?: {
    chapter: any;
    readtill: string;
    total: string;
    readAt: Date;
  }[];
  bio?: string;
  profession?: string;
  interests?: string[];
  visibility?: "Public" | "Private";
  isProfileCompleted?: boolean;
  usernameLastChangedAt?: Date | null;
  deletionStatus?: DeletionStatus;
  deletionScheduledAt?: Date | null;
  deletionToken?: string | null;
  isLoggedIn?: boolean;
  lastLoginAt?: Date | null;
  lastLogoutAt?: Date | null;
  lastActiveAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
