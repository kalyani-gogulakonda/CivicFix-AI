export const CATEGORIES = [
  { value: "pothole", label: "Pothole" },
  { value: "garbage", label: "Overflowing garbage" },
  { value: "streetlight", label: "Broken streetlight" },
  { value: "water_leakage", label: "Water leakage" },
  { value: "other", label: "Other" },
] as const;

export type Category = (typeof CATEGORIES)[number]["value"];
export type Priority = "low" | "medium" | "high";
export type Status = "draft" | "ready";

export interface ComplaintInput {
  category: Category;
  location: string;
  description: string;
  hasPhoto?: boolean;
}

export interface AiResult {
  mode: "ai" | "demo";
  category: Category;
  summary: string;
  missingInfo: string[];
  priority: Priority;
  priorityReason: string;
  draft: string;
}

export interface Complaint extends ComplaintInput {
  id: string;
  createdAt: string;
  status: Status;
  summary: string;
  priority: Priority;
  text: string;
  photo?: string;
  aiMode: "ai" | "demo";
}

export const categoryLabel = (c: Category) => CATEGORIES.find((x) => x.value === c)?.label ?? c;
