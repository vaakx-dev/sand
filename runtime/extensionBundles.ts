import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";

import type { LoadedExtension } from "./extensionFiles.ts";

export class ExtensionBundles {
  constructor(private readonly cache: string) {}

  async ui(extension: LoadedExtension): Promise<string> {
    const path = this.path(extension, "js");
    const cached = await readCached(path);
    if (cached !== null) return cached;

    const result = await Bun.build({
      entrypoints: [resolve(extension.root, extension.manifest.ui!)],
      target: "browser",
      format: "esm",
      minify: false,
      sourcemap: "inline",
    });
    if (!result.success) {
      throw new Error(result.logs.map((log) => log.message).join("\n"));
    }
    const output = result.outputs.find((item) => item.path.endsWith(".js"));
    if (!output) throw new Error(`no JavaScript emitted for ${extension.manifest.id}`);
    const source = await output.text();
    await save(path, source);
    return source;
  }

  async styles(extension: LoadedExtension): Promise<string[]> {
    const entries = extension.manifest.styles ?? [];
    if (entries.length === 0) return [];
    const path = this.path(extension, "css.json");
    const cached = await readCached(path);
    if (cached !== null) return JSON.parse(cached) as string[];

    const styles = await Promise.all(
      entries.map((entry) => readFile(resolve(extension.root, entry), "utf8")),
    );
    await save(path, JSON.stringify(styles));
    return styles;
  }

  private path(extension: LoadedExtension, suffix: string): string {
    return join(
      this.cache,
      "ui",
      `${safeName(extension.manifest.id)}-${extension.fingerprint}.${suffix}`,
    );
  }
}

async function readCached(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function save(path: string, value: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, value, "utf8");
}

function safeName(id: string): string {
  return basename(id.replaceAll(/[^a-zA-Z0-9._-]/gu, "_"));
}
