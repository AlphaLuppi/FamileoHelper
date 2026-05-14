import Anthropic from "@anthropic-ai/sdk";

export type ClaudeOptions = {
  oauthToken: string;
  model?: string;
};

export interface ClaudeClient {
  prompt(text: string): Promise<string>;
}

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

export class ClaudeAgentSdkClient implements ClaudeClient {
  private client: Anthropic;
  private model: string;

  constructor(opts: ClaudeOptions) {
    this.client = new Anthropic({
      authToken: opts.oauthToken,
      defaultHeaders: {
        "anthropic-beta": "oauth-2025-04-20",
      },
    });
    this.model = opts.model ?? DEFAULT_MODEL;
  }

  async prompt(text: string): Promise<string> {
    try {
      const res = await this.client.messages.create({
        model: this.model,
        max_tokens: 400,
        messages: [{ role: "user", content: text }],
      });
      let output = "";
      for (const block of res.content) {
        if (block.type === "text") output += block.text;
      }
      return output.trim();
    } catch (e) {
      const err = e as { message?: string; status?: number; error?: unknown };
      console.error("[claude] API call failed:", err.status, err.message);
      if (err.error) console.error("[claude] error body:", JSON.stringify(err.error).slice(0, 500));
      throw e;
    }
  }
}
