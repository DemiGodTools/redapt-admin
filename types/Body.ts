import { MediaType, SubscriptionPlan } from "@/enums";
import { Types } from "mongoose";

export interface CreateChapterBody {
  title: string;
  details: string;
  media: string;
  type?: MediaType;
  for?: SubscriptionPlan;
  isTrending?: boolean;
  cover: string;
  category: string;
  series?: string;
  author: string;
  isDownloadable?: boolean;
  transcript?: string;
  lyrics?: string;
  toc?: {
    cut: string;
    title: string;
  }[];
}

export interface CreateCategoryBody {
  name: string;
  image: string; // image URL
}

export interface CreateSeriesBody {
  title: string;
  description: string;
  cover: string;
  category: Types.ObjectId;
  for?: SubscriptionPlan;
}

export interface UpdateSeriesBody {
  title?: string;
  description?: string;
  cover?: string;
  for?: SubscriptionPlan;
  category?: Types.ObjectId;
  chapters?: {
    content: string;        // Chapter or Question ID
    contentModel: "Chapter" | "Question";
    order: number;
  }[];
}

export interface AddSeriesContentBody {
  series: string;
  content: string;
  contentModel: "Chapter" | "Question";
  order?: number;
}

export interface CreateQuestionBody {
  question: string;
  options: string[];
  correct: number;
  explanation?: string;
}

export interface AddCommentBody {
  chapterId: string;
  text: string;
}
