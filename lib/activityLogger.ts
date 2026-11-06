import connectMongo from "@/lib/connectMongo";
import { ActivityLog } from "@/models/ActivityLog.model";

export interface LogActivityParams {
  action: string;
  category: "content" | "banner" | "qna" | "auth" | "general";
  title: string;
  description?: string;
  performedBy?: string;
  performedByRole?: string;
  metadata?: Record<string, any>;
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await connectMongo();
    await ActivityLog.collection.insertOne({
      action: params.action,
      category: params.category,
      title: params.title,
      description: params.description || "",
      performedBy: params.performedBy || "Master Admin",
      performedByRole: params.performedByRole || "admin",
      metadata: params.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}

