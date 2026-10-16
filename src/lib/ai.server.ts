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
  photoRelevance: z.enum(["matches", "does_not_match", "unclear", "no_photo"]),
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
- photoRelevance: "matches" only if the photo clearly shows the reported issue; "does_not_match" if it shows something unrelated; "unclear" if you cannot tell; "no_photo" if no photo is attached.
- If photoRelevance is not "matches", the complaintText must NOT mention, reference or rely on any photo or attachment.
- summary: one short sentence in English.
- missingInfo: specific details still needed for the municipality to act (exact spot, size, duration, safety risk...), as short English questions. Empty if nothing important is missing. If the description is vague, list several.
- urgency (low/medium/high) and urgencyReason: one short English sentence. This is a suggestion for human review.
- complaintText: a polite, formal complaint letter (120-200 words) addressed to the Municipal Services Department, written ENTIRELY in the requested output language. Include a date line with today's date (provided in the input), never a date placeholder. Do not invent facts not given by the resident or visible in the photo.
Never claim the complaint has been submitted or resolved. Never include personal data (names, phone numbers, ID numbers, home addresses); sign off with a placeholder for the resident's name ("[Your name]" in English, "[మీ పేరు]" in Telugu).`;

const TELUGU_LETTER_INSTRUCTIONS = `For Telugu complaintText, override the generic English letter format and default Municipal Services Department addressee above. Write a standard, respectful Telugu అధికారిక లేఖ / ఫిర్యాదు పత్రం, not a literal translation of an English letter. Use readable plain text with blank lines between sections, no Markdown decoration, and this exact order:
1. గ్రహీత: followed by the relevant officer's designation and department ONLY if explicitly supplied by the resident. Never infer an officer or department from the category or landmark. Otherwise write "గ్రహీత: [సంబంధిత అధికారికి]".
2. స్థలం: [స్థలం] and తేదీ: on separate lines. For తేదీ, always write today's date exactly as provided in the input (e.g. తేదీ: 2026-10-16) — never a placeholder. Use a letter's place only if explicitly provided for that purpose; an issue's location is not automatically the sender's place. Do not invent the place.
3. విషయం: a concise Telugu subject identifying the reported issue.
4. Respectful salutation: "మహోదయులకు,".
5. Body: clearly describe the supplied issue, its exact reported location, duration and impact when known, then politely request inspection and appropriate action. Use natural, formal Telugu such as "తగిన చర్యలు తీసుకోవలసిందిగా వినమ్రంగా కోరుతున్నాను." Do not invent measurements, dates, previous complaints, risks or promises. Retain proper names and location identifiers accurately rather than inventing Telugu equivalents. All surrounding prose and section labels must be Telugu.
6. Respectful closing: "ధన్యవాదములతో," followed by "భవదీయుడు/భవదీయురాలు," and "[మీ పేరు]". Never insert actual personal details.
Keep the existing photo-evidence restrictions: if photoRelevance is not "matches", the letter must not mention a photo, an attachment or photographic evidence, even if the resident wants to keep the photo. Do not add an attachments section in that case.
The other JSON fields still follow the original English-summary and analysis instructions. Return the full Telugu letter in complaintText within the existing JSON schema.`;

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
Photo attached: ${input.photo ? "yes (see image)" : "no"}
Today's date (use for the letter date): ${new Date().toISOString().slice(0, 10)}`;

  const content: Array<{ type: "text"; text: string } | { type: "image"; image: URL }> = [{ type: "text", text }];
  if (input.photo) content.push({ type: "image", image: new URL(input.photo) });

  const result = streamText({
    model: provider.responses(MODEL),
    instructions: input.language === "te" ? `${INSTRUCTIONS}\n\n${TELUGU_LETTER_INSTRUCTIONS}` : INSTRUCTIONS,
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
    photoRelevance: input.photo ? (out.photoRelevance === "no_photo" ? "unclear" : out.photoRelevance) : "no_photo",
  };
}
