import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { captionRoutes } from "../src/routes/caption.js";
import { CaptionService } from "../src/llm/CaptionService.js";
import type { ClaudeClient } from "../src/llm/claudeClient.js";

const fakeClaude: ClaudeClient = {
  prompt: async () => "Joli moment de famille.",
};

function makeApp() {
  const app = new Hono();
  app.route("/", captionRoutes(new CaptionService(fakeClaude)));
  return app;
}

describe("POST /caption", () => {
  it("returns a caption from metadata", async () => {
    const res = await makeApp().request("/caption", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        date: "2026-05-10",
        city: "Lyon",
        photoCount: 2,
        weekday: "dimanche",
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { caption: string };
    expect(body.caption).toBe("Joli moment de famille.");
  });

  it("400 on bad input", async () => {
    const res = await makeApp().request("/caption", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ city: "Lyon" }),
    });
    expect(res.status).toBe(400);
  });

  it("reformulates when mode=reformulate", async () => {
    const res = await makeApp().request("/caption?mode=reformulate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ transcribed: "balade au parc cool" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { caption: string };
    expect(body.caption).toBe("Joli moment de famille.");
  });
});
