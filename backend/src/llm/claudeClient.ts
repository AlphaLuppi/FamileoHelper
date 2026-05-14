import { query } from "@anthropic-ai/claude-agent-sdk";

export type ClaudeOptions = {
  oauthToken: string;
};

export interface ClaudeClient {
  prompt(text: string): Promise<string>;
}

export class ClaudeAgentSdkClient implements ClaudeClient {
  constructor(private opts: ClaudeOptions) {}

  async prompt(text: string): Promise<string> {
    let output = "";
    let sawAssistant = false;
    let lastError: unknown = null;

    try {
      const stream = query({
        prompt: text,
        options: {
          env: {
            CLAUDE_CODE_OAUTH_TOKEN: this.opts.oauthToken,
          },
          model: "claude-haiku-4-5-20251001",
          permissionMode: "bypassPermissions",
          allowDangerouslySkipPermissions: true,
        },
      });
      for await (const msg of stream) {
        if (msg.type === "assistant") {
          sawAssistant = true;
          for (const block of msg.message.content) {
            if (block.type === "text") output += block.text;
          }
        } else if (msg.type === "system" || msg.type === "result") {
          console.log("[claude] stream msg type=", msg.type, JSON.stringify(msg).slice(0, 400));
        }
      }
    } catch (e) {
      lastError = e;
      console.error("[claude] query threw:", (e as Error)?.message ?? e);
      if ((e as Error)?.stack) console.error((e as Error).stack);
    }

    if (!sawAssistant) {
      console.warn(
        "[claude] no assistant message received. error=",
        lastError ? String(lastError) : "(none)",
      );
    }

    return output.trim();
  }
}
