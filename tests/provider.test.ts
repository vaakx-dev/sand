import { describe, expect, test } from "bun:test";

import { browserCommand } from "../extensions/provider-chatgpt/auth.ts";

describe("ChatGPT subscription provider", () => {
  test("passes OAuth query strings as one Windows argument", () => {
    const url = "https://auth.openai.com/oauth/authorize?response_type=code&client_id=test&scope=openid";
    const command = browserCommand(url);
    expect(command.at(-1)).toBe(url);
    if (process.platform === "win32") {
      expect(command).toEqual(["rundll32.exe", "url.dll,FileProtocolHandler", url]);
    }
  });
});
