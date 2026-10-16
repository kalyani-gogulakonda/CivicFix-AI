import { expect, it } from "vitest";
import { generateWithAi } from "@/lib/ai.server";

// Opt-in live integration check: this makes one billable AI request.
it.skipIf(process.env["RUN_LIVE_AI_TESTS"] !== "1")("generates an ordered Telugu formal letter without inventing recipient, place or date", async () => {
  const result = await generateWithAi({
    category: "pothole",
    language: "te",
    location: "Near the public library on Park Road",
    description: "A pothole has been here for two weeks and collects rainwater. Please inspect and repair it.",
  });
  const letter = result.complaintText;
  const sections = ["గ్రహీత", "స్థలం", "తేదీ", "విషయం", "మహోదయులకు", "ధన్యవాదములతో", "[మీ పేరు]"];
  const positions = sections.map((section) => letter.indexOf(section));
  for (const position of positions) expect(position).toBeGreaterThanOrEqual(0);
  expect(positions).toEqual([...positions].sort((a, b) => a - b));
  expect(letter).toContain("[సంబంధిత అధికారికి]");
  expect(letter).toContain("[స్థలం]");
  expect(letter).not.toContain("[తేదీ]");
  expect(letter).toMatch(/తేదీ:\s*\d{2}\/\d{2}\/\d{4}/);
  expect(result.photoRelevance).toBe("no_photo");
}, 150_000);