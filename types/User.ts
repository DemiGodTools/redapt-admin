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
  /** 256px avatar variant */
  imageMd?: string;
  /** 128px avatar variant */
  imageSm?: string;
  joinedSeries?: Types.ObjectId;
  profileLevel: number;
  questionsAttempted: IAttemptedQuestion[];
  correctAnsStreak?: number;
  streakData?: {
    currentStreak: number;
    longestStreak: number;
    lastActiveDate: string; // "YYYY-MM-DD"
    todayReadingSeconds: number; // Cumulative seconds read today
    isCompletedToday: boolean; // Has hit 240s today (4 mins)
    lastCompletedDate?: string; // "YYYY-MM-DD" when goal was last completed
    timezone?: string;
    streak?: number; // legacy compatibility
    lastDate?: string; // legacy compatibility
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
  referralCode?: string;
  referredBy?: Types.ObjectId | null;
  hasRedeemedReferral?: boolean;
  totalReferralsCount?: number;
  createdAt: Date;
  updatedAt: Date;
}
