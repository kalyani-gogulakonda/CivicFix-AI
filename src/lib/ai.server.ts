import { createOpenAI } from "@ai-sdk/openai";
import { Output, streamText } from "ai";
import { z } from "zod";
import type { ComplaintInput, AiResult } from "./complaint-types";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

const schema = z.object({
  category: z.enum(["pothole", "garbage", "streetlight", "water_leakage", "other"]),
  summary: z.string(),
  missingInfo: z.array(z.string()),
  priority: z.enum(["low", "medium", "high"]),
  priorityReason: z.string(),
  draft: z.string(),
});

const INSTRUCTIONS = `You help residents write civic complaints to their local municipality.
Given a category, location and description: classify the issue, write a one-sentence summary,
list specific missing details that would help the municipality act (e.g. exact spot, size, how long, safety risk) as short questions,
suggest a priority (low/medium/high) with one short sentence of reasoning for human review,
and draft a polite, professional complaint letter in clear English (120-200 words) addressed "To the Municipal Services Department".
Never claim the complaint has been submitted or resolved. Never ask for or include sensitive personal data (ID numbers, phone, email, full name); end with "[Your name]".`;

export async function generateWithAi(input: ComplaintInput): Promise<AiResult> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return demoResult(input);

  const provider = createOpenAI({
    baseURL: GATEWAY,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  const result = streamText({
    model: provider.responses(MODEL),
    instructions: INSTRUCTIONS,
    output: Output.object({ schema }),
    messages: [
      {
        role: "user",
        content: `Category chosen by resident: ${input.category}\nLocation / landmark: ${input.location}\nDescription: ${input.description}${input.hasPhoto ? "\n(The resident attached a photo.)" : ""}`,
      },
    ],
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
  const output = await result.output;
  return { ...output, mode: "ai" };
}

export function demoResult(input: ComplaintInput): AiResult {
  const label = input.category.replace("_", " ");
  const missing: string[] = [];
  if (input.location.length < 15) missing.push("Can you give a more precise location or nearby landmark?");
  if (!/\b(day|week|month|since|ago)\b/i.test(input.description)) missing.push("How long has this problem existed?");
  if (!/\b(danger|safety|accident|child|injur|risk)\b/i.test(input.description))
    missing.push("Is there any immediate safety risk?");
  const high = /\b(danger|accident|injur|flood|dark|deep)\b/i.test(input.description);
  return {
    mode: "demo",
    category: input.category,
    summary: `Reported ${label} issue near ${input.location}.`,
    missingInfo: missing,
    priority: high ? "high" : "medium",
    priorityReason: high
      ? "The description mentions a possible safety risk."
      : "No immediate danger was described; standard handling suggested.",
    draft: `To the Municipal Services Department,\n\nI would like to report a ${label} issue near ${input.location}.\n\n${input.description}\n\nI kindly request that this be inspected and addressed at your earliest convenience. Thank you for your attention to this matter.\n\nSincerely,\n[Your name]`,
  };
}
