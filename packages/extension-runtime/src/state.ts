import { join } from "node:path";

import type { HostExtensionContext } from "@sand/extension-api";

import { readJson, writeJson } from "./json.ts";

interface SharedState {
  value: unknown;
  pending: Promise<void>;
}

const states = new Map<string, SharedState>();
const opening = new Map<string, Promise<SharedState>>();

export class ExtensionState<T> {
  private constructor(
    private readonly path: string,
    private readonly state: SharedState,
  ) {}

  static async open<T>(
    context: HostExtensionContext,
    fallback: T,
  ): Promise<ExtensionState<T>> {
    const path = join(
      context.home,
      "state",
      safeId(context.manifest.id),
      "state.json",
    );
    const state = await sharedState(path, fallback);
    return new ExtensionState<T>(path, state);
  }

  get(): T {
    return structuredClone(this.state.value) as T;
  }

  async set(value: T): Promise<void> {
    this.state.value = structuredClone(value);
    const snapshot = structuredClone(this.state.value);
    this.state.pending = this.state.pending.catch(() => undefined).then(async () => {
      await writeJson(this.path, snapshot);
    });
    await this.state.pending;
  }

  async flush(): Promise<void> {
    await this.state.pending;
  }
}

async function sharedState<T>(path: string, fallback: T): Promise<SharedState> {
  const existing = states.get(path);
  if (existing) return existing;
  let pending = opening.get(path);
  if (!pending) {
    pending = readJson<T>(path).then((value) => {
      const state: SharedState = {
        value: structuredClone(value === undefined ? fallback : value),
        pending: Promise.resolve(),
      };
      states.set(path, state);
      opening.delete(path);
      return state;
    }, (error) => {
      opening.delete(path);
      throw error;
    });
    opening.set(path, pending);
  }
  return pending;
}

function safeId(value: string): string {
  const id = value.replaceAll(/[^a-zA-Z0-9._-]/gu, "_");
  if (!id) throw new Error("extension id cannot create a state directory");
  return id;
}
