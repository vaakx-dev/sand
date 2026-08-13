export interface Session {
  id: string;
  cwd: string;
  model: string;
  reasoning: string;
  serviceTier: string;
  active?: ActiveTurn;
}

export interface ActiveTurn {
  id?: string;
  cancelled: boolean;
  error?: string;
  streamed: Map<string, string>;
  resolve(stopReason: "end_turn" | "cancelled"): void;
  reject(error: Error): void;
}

export interface CodexThread {
  id: string;
  name?: string | null;
  preview?: string;
  turns?: CodexTurn[];
}

export interface CodexTurn {
  id: string;
  status?: string;
  error?: { message?: string } | null;
  items?: CodexItem[];
}

export interface CodexItem {
  id: string;
  type: string;
  text?: string;
  content?: unknown[];
  command?: string;
  cwd?: string;
  status?: string;
  aggregatedOutput?: string | null;
  exitCode?: number | null;
  changes?: unknown[];
  server?: string;
  tool?: string;
  arguments?: unknown;
  result?: unknown;
  error?: unknown;
  contentItems?: unknown;
}

export function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function requiredText(value: unknown, label: string): string {
  const result = text(value).trim();
  if (!result) throw new Error(`${label} is required`);
  return result;
}
