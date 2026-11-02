import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  category: z.enum(["pothole", "garbage", "streetlight", "water_leakage", "other"]),
  location: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10).max(2000),
  language: z.enum(["en", "te"]),
  photo: z
    .string()
    .max(7_000_000)
    .regex(/^data:image\/(png|jpe?g|webp|gif);base64,/)
    .optional(),
});

export const generateComplaint = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data }) => {
    const { generateWithAi } = await import("./ai.server");
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
      const sb = createClient(process.env["SUPABASE_URL"]!, key, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        } },
      });
      const { data: allowed, error: limErr } = await sb.rpc("claim_ai_generation", { _limit: 50 });
      if (limErr) throw new Error("LIMIT_CHECK_FAILED");
      if (!allowed) return { ok: false as const, error: "This demo has reached its limit of 50 AI drafts for today. Please come back tomorrow.", limit: true };
    } catch (e) {
      console.error("Limit check failed", e);
      return { ok: false as const, error: "Could not check today's AI usage. Please try again shortly." };
    }
    try {
      return { ok: true as const, result: await generateWithAi(data) };
    } catch (e) {
      console.error("AI generation failed", e);
      const msg = e instanceof Error ? e.message : String(e);
      let error = "Something went wrong, please retry.";
      if (msg === "AI_NOT_CONFIGURED" || msg === "AI_HTTP_401") error = "The AI service is not configured for this app.";
      else if (msg === "AI_INVALID_OUTPUT" ) error = "The AI returned an incomplete answer. Please try again.";
      else if (msg === "AI_HTTP_429") error = "The AI is busy right now. Please wait a moment and retry.";
      return { ok: false as const, error };
    }
  });
