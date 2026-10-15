import { createOpenAI } from "@ai-sdk/openai";
import { Output, streamText } from "ai";
import { z } from "zod";
import type { ComplaintInput, AiResult } from "./complaint-types";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

export const aiSchema = z.object({
  detectedCategory: z.enum(["pothole", "garbage", "streetlight", "water_leakage", "other"]),
  categoryMatches: z.boolean(),
  photoObservations: z.string(),
  summary: z.string().min(1),
  missingInfo: z.array(z.string()),
  urgency: z.enum(["low", "medium", "high"]),
  urgencyReason: z.string().min(1),
  complaintText: z.string().min(40),
});

const INSTRUCTIONS = `You help residents write civic complaints to their local municipality.
Given the resident's chosen category, location, description and optionally a photo:
- detectedCategory: the category that best fits the evidence. categoryMatches: true only if it equals the resident's chosen category.
- photoObservations: describe only what is actually visible in the photo, factually. If no photo is attached, return exactly "No photo provided". Never invent photo details.
- summary: one short sentence in English.
- missingInfo: specific details still needed for the municipality to act (exact spot, size, duration, safety risk...), as short English questions. Empty if nothing important is missing. If the description is vague, list several.
- urgency (low/medium/high) and urgencyReason: one short English sentence. This is a suggestion for human review.
- complaintText: a polite, formal complaint letter (120-200 words) addressed to the Municipal Services Department, written ENTIRELY in the requested output language. Do not invent facts not given by the resident or visible in the photo.
Never claim the complaint has been submitted or resolved. Never include personal data (names, phone numbers, ID numbers, home addresses); sign off with a placeholder for the resident's name ("[Your name]" in English, "[మీ పేరు]" in Telugu).`;

export async function generateWithAi(input: ComplaintInput): Promise<AiResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI_NOT_CONFIGURED");

  const provider = createOpenAI({
    baseURL: GATEWAY,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  const lang = input.language === "te" ? "Telugu (తెలుగు script)" : "English";
  const text = `Category chosen by resident: ${input.category}
Location / landmark: ${input.location}
Description: ${input.description}
Output language for complaintText: ${lang}
Photo attached: ${input.photo ? "yes (see image)" : "no"}`;

  const content: Array<{ type: "text"; text: string } | { type: "image"; image: URL }> = [{ type: "text", text }];
  if (input.photo) content.push({ type: "image", image: new URL(input.photo) });

  const result = streamText({
    model: provider.responses(MODEL),
    instructions: INSTRUCTIONS,
    output: Output.object({ schema: aiSchema }),
    messages: [{ role: "user", content }],
    maxRetries: 0,
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  const raw = await result.output;
  const parsed = aiSchema.safeParse(raw);
  if (!parsed.success) throw new Error("AI_INVALID_OUTPUT");
  const out = parsed.data;
  return {
    ...out,
    categoryMatches: out.detectedCategory === input.category,
    photoObservations: input.photo ? out.photoObservations : "No photo provided",
  };
}
