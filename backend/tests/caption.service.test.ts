import { describe, it, expect } from "vitest";
import { CaptionService } from "../src/llm/CaptionService.js";
import type { ClaudeClient } from "../src/llm/claudeClient.js";

class FakeClaude implements ClaudeClient {
  public lastPrompt = "";
  constructor(private reply: string) {}
  async prompt(text: string) {
    this.lastPrompt = text;
    return this.reply;
  }
}

describe("CaptionService", () => {
  it("generates a caption from metadata", async () => {
    const claude = new FakeClaude("Belle balade dimanche au parc.");
    const svc = new CaptionService(claude);
    const caption = await svc.generate({
      date: "2026-05-10",
      city: "Lyon",
      photoCount: 3,
      weekday: "dimanche",
    });
    expect(caption).toBe("Belle balade dimanche au parc.");
    expect(claude.lastPrompt).toContain("Lyon");
    expect(claude.lastPrompt).toContain("dimanche");
    expect(claude.lastPrompt).toContain("3");
  });

  it("reformulates a transcribed text", async () => {
    const claude = new FakeClaude("On a passé un super dimanche au parc.");
    const svc = new CaptionService(claude);
    const caption = await svc.reformulate(
      "euh on a fait un truc au parc dimanche c'était cool",
    );
    expect(caption).toBe("On a passé un super dimanche au parc.");
    expect(claude.lastPrompt).toContain("euh on a fait");
  });

  it("falls back to a template if claude throws", async () => {
    const claude: ClaudeClient = {
      prompt: async () => {
        throw new Error("network down");
      },
    };
    const svc = new CaptionService(claude);
    const caption = await svc.generate({
      date: "2026-05-10",
      city: "Lyon",
      photoCount: 2,
      weekday: "dimanche",
    });
    expect(caption).toContain("Lyon");
  });
});
