import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { HostExtensionContext } from "@sand/extension-api";

export class ExtensionState<T> {
  private pending = Promise.resolve();

  private constructor(
    private readonly path: string,
    private value: T,
  ) {}

  static async open<T>(
    context: HostExtensionContext,
    fallback: T,
  ): Promise<ExtensionState<T>> {
    const path = join(
      context.workspace,
      ".sand",
      "state",
      safeId(context.manifest.id),
      "state.json",
    );
    try {
      return new ExtensionState(path, JSON.parse(await readFile(path, "utf8")) as T);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      return new ExtensionState(path, structuredClone(fallback));
    }
  }

  get(): T {
    return structuredClone(this.value);
  }

  async set(value: T): Promise<void> {
    this.value = structuredClone(value);
    const snapshot = structuredClone(this.value);
    this.pending = this.pending.catch(() => undefined).then(async () => {
      await mkdir(dirname(this.path), { recursive: true });
      const temporary = `${this.path}.next`;
      await writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
      await rename(temporary, this.path);
    });
    await this.pending;
  }

  async flush(): Promise<void> {
    await this.pending;
  }
}

function safeId(value: string): string {
  const id = value.replaceAll(/[^a-zA-Z0-9._-]/gu, "_");
  if (!id) throw new Error("extension id cannot create a state directory");
  return id;
}
