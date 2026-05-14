import { describe, it, expect } from "vitest";
import { MockFamileoClient } from "../src/famileo/MockFamileoClient.js";

const U = 1;

describe("MockFamileoClient", () => {
  it("lists seeded pads", async () => {
    const c = new MockFamileoClient();
    await c.ensureSession(U);
    const pads = await c.listPads(U);
    expect(pads.length).toBeGreaterThan(0);
    expect(pads[0]).toHaveProperty("id");
    expect(pads[0]).toHaveProperty("name");
  });

  it("returns the next closing gazette", async () => {
    const c = new MockFamileoClient();
    const pads = await c.listPads(U);
    const gazettes = await c.listGazettes(U, pads[0]!.id);
    expect(gazettes.length).toBeGreaterThan(0);
    expect(new Date(gazettes[0]!.closesAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("creates a post and returns an id", async () => {
    const c = new MockFamileoClient();
    const pads = await c.listPads(U);
    const result = await c.createPost(U, {
      padId: pads[0]!.id,
      text: "hello",
      photos: [
        { filename: "a.jpg", contentType: "image/jpeg", bytes: Buffer.from("xxxx") },
      ],
    });
    expect(result.postId).toMatch(/^post_/);
    expect(result.padId).toBe(pads[0]!.id);
  });

  it("rejects unknown padId", async () => {
    const c = new MockFamileoClient();
    await expect(
      c.createPost(U, { padId: "nope", text: "x", photos: [] }),
    ).rejects.toThrow(/unknown pad/i);
  });
});
