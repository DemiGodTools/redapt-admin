import { Schema, model, models, Types, Document } from "mongoose";

export interface IReferral extends Document {
  referrer: Types.ObjectId;
  referee: Types.ObjectId;
  refereeName?: string | null;
  refereeUserId?: string | null;
  codeUsed: string;
  status: "COMPLETED" | "PENDING";
  deviceId?: string | null;
  ipAddress?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ReferralSchema = new Schema<IReferral>(
  {
    referrer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    referee: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // One successful referral per user (strictly enforced)
      index: true,
    },
    refereeName: {
      type: String,
      default: null,
      trim: true,
    },
    refereeUserId: {
      type: String,
      default: null,
      trim: true,
    },
    codeUsed: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["COMPLETED", "PENDING"],
      default: "COMPLETED",
    },
    deviceId: {
      type: String,
      default: null,
      index: true,
    },
    ipAddress: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Fast compound index for querying referrer stats
ReferralSchema.index({ referrer: 1, createdAt: -1 });

export const Referral =
  models.Referral || model<IReferral>("Referral", ReferralSchema);
