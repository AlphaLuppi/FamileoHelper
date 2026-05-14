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
        for (const block of msg.message.content) {
          if (block.type === "text") output += block.text;
        }
      }
    }
    return output.trim();
  }
}
