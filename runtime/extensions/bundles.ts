import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";

import { missing, readJson } from "@sand/extension-runtime";
import type { BunPlugin } from "bun";

import { coreModulePlugin } from "../modules.ts";
import type { Loaded } from "./discovery.ts";

export class Bundles {
  private readonly core: BunPlugin;

  constructor(
    private readonly cache: string,
    appRoot: string,
  ) {
    this.core = coreModulePlugin(appRoot);
  }

  async prune(extension: Loaded): Promise<void> {
    const prefix = `${safeName(extension.manifest.id)}-`;
    const current = `${prefix}${extension.fingerprint}.`;
    let entries: string[];
    try {
      entries = await readdir(this.cache);
    } catch (error) {
      if (missing(error)) return;
      throw error;
    }
    await Promise.all(entries
      .filter((entry) => entry.startsWith(prefix) && !entry.startsWith(current))
      .map((entry) => rm(join(this.cache, entry), { force: true })));
  }

  async host(extension: Loaded): Promise<string> {
    const path = this.path(extension, "host.js");
    if (await readCached(path) === null) {
      await save(path, await this.build(extension, extension.manifest.main!, "bun"));
    }
    return path;
  }

  async ui(extension: Loaded): Promise<string> {
    const path = this.path(extension, "js");
    const cached = await readCached(path);
    if (cached !== null) return cached;

    const source = await this.build(extension, extension.manifest.ui!, "browser");
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
      `${safeName(extension.manifest.id)}-${extension.fingerprint}.${suffix}`,
    );
  }

  private async build(
    extension: Loaded,
    entry: string,
    target: "browser" | "bun",
  ): Promise<string> {
    const result = await Bun.build({
      entrypoints: [resolve(extension.root, entry)],
      target,
      format: "esm",
      minify: false,
      sourcemap: "inline",
      plugins: [this.core],
    });
    if (!result.success) {
      throw new Error(result.logs.map((log) => log.message).join("\n"));
    }
    const output = result.outputs.find((item) => item.path.endsWith(".js"));
    if (!output) throw new Error(`no JavaScript emitted for ${extension.manifest.id}`);
    return output.text();
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
