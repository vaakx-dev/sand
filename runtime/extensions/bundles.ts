import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";

import { missing, readJson } from "@sand/extension-runtime";

import type { Loaded } from "./discovery.ts";

export class Bundles {
  constructor(private readonly cache: string) {}

  async prune(extension: Loaded): Promise<void> {
    const directory = join(this.cache, "ui");
    const prefix = `${safeName(extension.manifest.id)}-`;
    const current = `${prefix}${extension.fingerprint}.`;
    let entries: string[];
    try {
      entries = await readdir(directory);
    } catch (error) {
      if (missing(error)) return;
      throw error;
    }
    await Promise.all(entries
      .filter((entry) => entry.startsWith(prefix) && !entry.startsWith(current))
      .map((entry) => rm(join(directory, entry), { force: true })));
  }

  async ui(extension: Loaded): Promise<string> {
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

  async styles(extension: Loaded): Promise<string[]> {
    const entries = extension.manifest.styles ?? [];
    if (entries.length === 0) return [];
    const path = this.path(extension, "css.json");
    const cached = await readJson<string[]>(path);
    if (cached) return cached;

    const styles = await Promise.all(
      entries.map((entry) => readFile(resolve(extension.root, entry), "utf8")),
    );
    await save(path, JSON.stringify(styles));
    return styles;
  }

  private path(extension: Loaded, suffix: string): string {
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
    if (missing(error)) return null;
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
