import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { JsonValue } from "@sand/extension-api";

import {
  browserLogin,
  refreshCredentials,
  type Credentials,
} from "./oauth.ts";

export class ChatGptAuth {
  constructor(private readonly path: string) {}

  async status(): Promise<JsonValue> {
    return authStatus(await this.load());
  }

  async login(): Promise<JsonValue> {
    const credentials = await browserLogin();
    await this.save(credentials);
    return authStatus(credentials);
  }

  async logout(): Promise<JsonValue> {
    await rm(this.path, { force: true });
    return authStatus(null);
  }

  async credentials(signal: AbortSignal): Promise<Credentials> {
    const current = await this.load();
    if (!current) {
      throw new Error("Sign in with ChatGPT from Sand settings before starting the agent");
    }
    if (current.expires > Date.now() + 60_000) return current;
    const refreshed = await refreshCredentials(current, signal);
    await this.save(refreshed);
    return refreshed;
  }

  private async load(): Promise<Credentials | null> {
    try {
      const value = JSON.parse(await readFile(this.path, "utf8")) as Credentials;
      return value.access && value.refresh && value.accountId ? value : null;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  private async save(credentials: Credentials): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(this.path, `${JSON.stringify(credentials, null, 2)}\n`, "utf8");
  }
}

function authStatus(credentials: Credentials | null): JsonValue {
  return {
    available: Boolean(credentials),
    label: credentials ? "Available" : "Signed out",
    description: credentials
      ? `Connected to ChatGPT account ${credentials.accountId.slice(0, 10)}… Tokens refresh automatically.`
      : "Browser sign-in uses Codex access from an eligible ChatGPT subscription. No API key is used.",
  };
}
