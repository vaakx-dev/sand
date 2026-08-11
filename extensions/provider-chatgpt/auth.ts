import { rm } from "node:fs/promises";

import type { JsonValue } from "@sand/extension-api";
import { readJson, writeJson } from "@sand/extension-runtime";

import {
  browserLogin,
  refreshCredentials,
  type Credentials,
} from "./oauth.ts";

export class ChatGptAuth {
  private refreshing?: Promise<Credentials>;

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
    this.refreshing ??= this.refresh(current, signal);
    try {
      return await this.refreshing;
    } finally {
      this.refreshing = undefined;
    }
  }

  private async load(): Promise<Credentials | null> {
    const value = await readJson<Credentials>(this.path);
    return value?.access && value.refresh && value.accountId ? value : null;
  }

  private async save(credentials: Credentials): Promise<void> {
    await writeJson(this.path, credentials);
  }

  private async refresh(current: Credentials, signal: AbortSignal): Promise<Credentials> {
    const refreshed = await refreshCredentials(current, signal);
    await this.save(refreshed);
    return refreshed;
  }
}

function authStatus(credentials: Credentials | null): JsonValue {
  return {
    available: Boolean(credentials),
    label: credentials ? "Available" : "Signed out",
    description: credentials
      ? `Connected to ChatGPT account ${credentials.accountId.slice(0, 10)}... Tokens refresh automatically.`
      : "Browser sign-in uses Codex access from an eligible ChatGPT subscription. No API key is used.",
  };
}
