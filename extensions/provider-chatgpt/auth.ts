import { createServer } from "node:http";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { objectValue, stringValue, type JsonObject, type JsonValue } from "@sand/extension-api";

const CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const AUTH_BASE_URL = "https://auth.openai.com";
const REDIRECT_URI = "http://localhost:1455/auth/callback";
const AUTH_CLAIM = "https://api.openai.com/auth";
const AUTH_TIMEOUT_MS = 5 * 60 * 1_000;

export interface Credentials {
  access: string;
  refresh: string;
  expires: number;
  accountId: string;
}

export class ChatGptAuth {
  constructor(private readonly path: string) {}

  async status(): Promise<JsonValue> {
    return authStatus(await this.load());
  }

  async login(): Promise<JsonValue> {
    const credentials = await this.browserLogin();
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

    const response = await fetch(`${AUTH_BASE_URL}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        "grant_type": "refresh_token",
        "refresh_token": current.refresh,
        "client_id": CLIENT_ID,
      }),
      signal,
    });
    const refreshed = await tokenCredentials(response, "refresh");
    await this.save(refreshed);
    return refreshed;
  }

  private async browserLogin(): Promise<Credentials> {
    const verifier = randomBase64url(64);
    const challenge = base64url(new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)),
    ));
    const state = randomBase64url(24);
    const url = authorizationUrl(state, challenge);

    const callback = waitForCallback(state);
    await openUrl(url);
    const code = await callback;
    const response = await fetch(`${AUTH_BASE_URL}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        "grant_type": "authorization_code",
        "client_id": CLIENT_ID,
        code,
        "code_verifier": verifier,
        "redirect_uri": REDIRECT_URI,
      }),
    });
    const credentials = await tokenCredentials(response, "login");
    await this.save(credentials);
    return credentials;
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

function authorizationUrl(state: string, challenge: string): string {
  const url = new URL(`${AUTH_BASE_URL}/oauth/authorize`);
  const parameters = {
    "response_type": "code",
    "client_id": CLIENT_ID,
    "redirect_uri": REDIRECT_URI,
    scope: "openid profile email offline_access",
    "code_challenge": challenge,
    "code_challenge_method": "S256",
    state,
    "id_token_add_organizations": "true",
    "codex_cli_simplified_flow": "true",
    originator: "sand",
  };
  for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);
  return url.toString();
}

function waitForCallback(expectedState: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const server = createServer((request, response) => {
      const url = new URL(request.url || "", "http://localhost");
      if (url.pathname !== "/auth/callback") {
        respond(response, 404, "Callback route not found.");
        return;
      }
      if (url.searchParams.get("state") !== expectedState) {
        respond(response, 400, "Authentication state mismatch.");
        finish(new Error("ChatGPT authentication state mismatch"));
        return;
      }
      const code = url.searchParams.get("code");
      if (!code) {
        respond(response, 400, "Authorization code missing.");
        finish(new Error("ChatGPT authorization code missing"));
        return;
      }
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end("<!doctype html><title>Sand signed in</title><style>body{font:16px system-ui;background:#111;color:#ddd;display:grid;place-items:center;height:100vh;margin:0}</style><p>Sand is signed in. You can close this window.</p>");
      finish(undefined, code);
    });
    const timeout = setTimeout(
      () => finish(new Error("ChatGPT login timed out")),
      AUTH_TIMEOUT_MS,
    );
    const finish = (error?: Error, code = "") => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      server.close();
      if (error) reject(error);
      else resolve(code);
    };
    server.once("error", (error) => finish(
      new Error(`Cannot start the OAuth callback server: ${error.message}`),
    ));
    server.listen(1455, "127.0.0.1");
  });
}

function respond(response: import("node:http").ServerResponse, status: number, body: string): void {
  response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(body);
}

async function openUrl(url: string): Promise<void> {
  const processHandle = Bun.spawn(browserCommand(url), { stdout: "ignore", stderr: "pipe" });
  const stderr = await new Response(processHandle.stderr as ReadableStream).text();
  const exitCode = await processHandle.exited;
  if (exitCode !== 0) {
    throw new Error(stderr.trim() || "Could not open the ChatGPT login page");
  }
}

export function browserCommand(url: string): string[] {
  return process.platform === "win32"
    ? ["rundll32.exe", "url.dll,FileProtocolHandler", url]
    : process.platform === "darwin"
      ? ["open", url]
      : ["xdg-open", url];
}

async function tokenCredentials(response: Response, operation: string): Promise<Credentials> {
  if (!response.ok) {
    throw new Error(`ChatGPT token ${operation} failed (${response.status}): ${await response.text()}`);
  }
  const value = await response.json() as {
    "access_token"?: string;
    "refresh_token"?: string;
    "expires_in"?: number;
  };
  const accessToken = value["access_token"];
  const refreshToken = value["refresh_token"];
  const expiresIn = value["expires_in"];
  if (!accessToken || !refreshToken || typeof expiresIn !== "number") {
    throw new Error(`ChatGPT token ${operation} response was incomplete`);
  }
  const claim = objectValue(decodeJwt(accessToken)[AUTH_CLAIM]);
  const accountId = stringValue(claim["chatgpt_account_id"]);
  if (!accountId) throw new Error("ChatGPT token does not contain an account ID");
  return {
    access: accessToken,
    refresh: refreshToken,
    expires: Date.now() + expiresIn * 1_000,
    accountId,
  };
}

function decodeJwt(token: string): JsonObject {
  const payload = token.split(".")[1];
  if (!payload) throw new Error("ChatGPT returned an invalid access token");
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as JsonObject;
}

function randomBase64url(bytes: number): string {
  return base64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

function base64url(value: Uint8Array): string {
  return Buffer.from(value).toString("base64url");
}

function authStatus(credentials: Credentials | null): JsonValue {
  return {
    authenticated: Boolean(credentials),
    accountId: credentials?.accountId || "",
    expiresAt: credentials ? new Date(credentials.expires).toISOString() : "",
  };
}
