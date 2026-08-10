import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";

import {
  errorMessage,
  type ExtensionDescription,
  type ExtensionManifest,
  type HostExtension,
} from "@sand/extension-api";

export interface LoadedExtension {
  manifest: ExtensionManifest;
  root: string;
  source: ExtensionDescription["source"];
  fingerprint: string;
  enabled: boolean;
  hostActive: boolean;
  uiActive: boolean;
  contributions: string[];
  module?: HostExtension;
}

export interface ExtensionRoot {
  path: string;
  source: ExtensionDescription["source"];
}

export async function discoverExtensions(
  roots: ExtensionRoot[],
  disabled: Set<string>,
): Promise<Map<string, LoadedExtension>> {
  const discovered = new Map<string, LoadedExtension>();
  for (const root of roots) {
    for (const directory of await childDirectories(root.path)) {
      const manifestPath = join(directory, "sand.extension.json");
      try {
        const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as ExtensionManifest;
        validateManifest(manifest, manifestPath);
        discovered.set(manifest.id, {
          manifest,
          root: directory,
          source: root.source,
          fingerprint: await fingerprint(directory),
          enabled: !disabled.has(manifest.id),
          hostActive: false,
          uiActive: false,
          contributions: contributions(manifest),
        });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          console.error(`extension discovery failed in ${directory}: ${errorMessage(error)}`);
        }
      }
    }
  }
  return discovered;
}

async function childDirectories(root: string): Promise<string[]> {
  try {
    const entries = await readdir(root, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(root, entry.name))
      .sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function fingerprint(root: string): Promise<string> {
  const hash = createHash("sha256");
  for (const path of await sourceFiles(root)) {
    const metadata = await stat(path);
    hash.update(relative(root, path));
    hash.update(String(metadata.size));
    hash.update(String(metadata.mtimeMs));
  }
  return hash.digest("hex").slice(0, 16);
}

async function sourceFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  const visit = async (directory: string): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if ([".git", "dist", "node_modules"].includes(entry.name)) continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) files.push(path);
    }
  };
  await visit(root);
  return files.sort();
}

function validateManifest(manifest: ExtensionManifest, path: string): void {
  if (!manifest.id || !manifest.name || !manifest.version) {
    throw new Error(`invalid extension manifest: ${path}`);
  }
  if (manifest.styles?.some((entry) => typeof entry !== "string" || entry.length === 0)) {
    throw new Error(`invalid extension styles: ${path}`);
  }
  if (manifest.themes?.some((theme) => !theme.id || !theme.label)) {
    throw new Error(`invalid extension themes: ${path}`);
  }
}

function contributions(manifest: ExtensionManifest): string[] {
  return [
    ...(manifest.styles ?? []).map((entry) => `style:${entry}`),
    ...(manifest.themes ?? []).map((theme) => `theme:${theme.id}`),
  ];
}
