export const CATEGORIES = [
  { value: "pothole", label: "Pothole" },
  { value: "garbage", label: "Overflowing garbage" },
  { value: "streetlight", label: "Broken streetlight" },
  { value: "water_leakage", label: "Water leakage" },
  { value: "other", label: "Other" },
] as const;

export const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "te", label: "తెలుగు (Telugu)" },
] as const;

export type Category = (typeof CATEGORIES)[number]["value"];
export type Language = (typeof LANGUAGES)[number]["value"];
export type Urgency = "low" | "medium" | "high";
export type PhotoRelevance = "matches" | "does_not_match" | "unclear" | "no_photo";
export type Status = "draft" | "ready";

export interface ComplaintInput {
  category: Category;
  location: string;
  description: string;
  language: Language;
  photo?: string | undefined; // data URL, only sent to the AI
}

export interface AiResult {
  detectedCategory: Category;
  categoryMatches: boolean;
  photoObservations: string;
  photoRelevance: PhotoRelevance;
  summary: string;
  missingInfo: string[];
  urgency: Urgency;
  urgencyReason: string;
  complaintText: string;
}

export interface Complaint {
  id: string;
  category: Category;
  location: string;
  description: string;
  photoPath: string | null;
  language: Language;
  summary: string;
  missingInfo: string[];
  urgency: Urgency;
  urgencyReason: string;
  photoObservations: string;
  text: string;
  status: Status;
  isSample: boolean;
  createdAt: string;
  updatedAt: string;
}

export const hasPlaceholders = (t: string) => /\[[^\]]*\]/.test(t);

export const categoryLabel = (c: Category) => CATEGORIES.find((x) => x.value === c)?.label ?? c;
export const languageLabel = (l: Language) => LANGUAGES.find((x) => x.value === l)?.label ?? l;
