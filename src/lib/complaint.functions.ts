import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  category: z.enum(["pothole", "garbage", "streetlight", "water_leakage", "other"]),
  location: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10).max(2000),
  hasPhoto: z.boolean().optional(),
});

export const generateComplaint = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data }) => {
    const { generateWithAi, demoResult } = await import("./ai.server");
    try {
      return await generateWithAi(data);
    } catch (e) {
      console.error("AI generation failed", e);
      const msg = e instanceof Error ? e.message : String(e);
      if (/402|credit/i.test(msg)) throw new Error("AI credits are exhausted. Please try again later.");
      if (/429|rate/i.test(msg)) throw new Error("The AI is busy right now. Please wait a moment and retry.");
      if (/401|api key/i.test(msg)) return demoResult(data);
      throw new Error("The AI assistant could not generate a draft. Please try again.");
    }
  });
