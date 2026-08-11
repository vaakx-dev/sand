import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

import {
  errorMessage,
  type ExtensionDescription,
  type ExtensionManifest,
  type HostExtensionCleanup,
} from "@sand/extension-api";
import { missing, readJson } from "@sand/extension-runtime";

export interface Loaded {
  manifest: ExtensionManifest;
  root: string;
  source: ExtensionDescription["source"];
  fingerprint: string;
  enabled: boolean;
  hostActive: boolean;
  uiActive: boolean;
  contributions: string[];
  errors: string[];
  blocked?: string;
  cleanup?: HostExtensionCleanup;
}

export interface Root {
  path: string;
  source: ExtensionDescription["source"];
}

export async function discover(
  roots: Root[],
  disabled: Set<string>,
): Promise<Map<string, Loaded>> {
  const discovered = new Map<string, Loaded>();
  for (const root of roots) {
    for (const directory of await childDirectories(root.path)) {
      const manifestPath = join(directory, "sand.extension.json");
      try {
        const manifest = await readJson<ExtensionManifest>(manifestPath);
        if (!manifest) continue;
        await validateManifest(manifest, manifestPath, directory);
        if (discovered.has(manifest.id)) {
          throw new Error(`duplicate extension id: ${manifest.id}`);
        }
        discovered.set(manifest.id, {
          manifest,
          root: directory,
          source: root.source,
          fingerprint: await fingerprint(directory),
          enabled: !disabled.has(manifest.id),
          hostActive: false,
          uiActive: false,
          contributions: contributions(manifest),
          errors: [],
        });
      } catch (error) {
        console.error(`extension discovery failed in ${directory}: ${errorMessage(error)}`);
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
    if (missing(error)) return [];
    throw error;
  }
}

async function fingerprint(root: string): Promise<string> {
  const hash = createHash("sha256");
  for (const path of await sourceFiles(root)) {
    hash.update(relative(root, path));
    hash.update(await readFile(path));
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

async function validateManifest(
  manifest: ExtensionManifest,
  path: string,
  root: string,
): Promise<void> {
  if (!text(manifest.id) || !text(manifest.name) || !text(manifest.version)) {
    throw new Error(`invalid extension manifest: ${path}`);
  }
  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/u.test(manifest.id)) {
    throw new Error(`invalid extension id: ${manifest.id}`);
  }
  if (manifest.main !== undefined) await validateFile(root, manifest.main, "main", path);
  if (manifest.ui !== undefined) await validateFile(root, manifest.ui, "ui", path);
  if (
    manifest.styles !== undefined
    && (!Array.isArray(manifest.styles) || manifest.styles.some((entry) => !text(entry)))
  ) {
    throw new Error(`invalid extension styles: ${path}`);
  }
  for (const style of manifest.styles ?? []) await validateFile(root, style, "style", path);
  if (
    manifest.requires !== undefined
    && (
      !Array.isArray(manifest.requires)
      || manifest.requires.some((id) => !text(id) || id === manifest.id)
    )
    || new Set(manifest.requires ?? []).size !== (manifest.requires?.length ?? 0)
  ) {
    throw new Error(`invalid extension dependencies: ${path}`);
  }
  if (
    manifest.themes !== undefined
    && (
      !Array.isArray(manifest.themes)
      || manifest.themes.some((theme) => !theme || !text(theme.id) || !text(theme.label))
    )
  ) {
    throw new Error(`invalid extension themes: ${path}`);
  }
  const themeIds = manifest.themes?.map((theme) => theme.id) ?? [];
  if (new Set(themeIds).size !== themeIds.length) {
    throw new Error(`duplicate extension themes: ${path}`);
  }
}

async function validateFile(
  root: string,
  entry: unknown,
  kind: string,
  manifest: string,
): Promise<void> {
  if (!text(entry) || isAbsolute(entry)) {
    throw new Error(`invalid extension ${kind}: ${manifest}`);
  }
  const path = resolve(root, entry);
  const child = relative(root, path);
  if (!child || child === ".." || child.startsWith(`..${sep}`) || isAbsolute(child)) {
    throw new Error(`extension ${kind} escapes its directory: ${manifest}`);
  }
  try {
    if (!(await stat(path)).isFile()) throw new Error("not a file");
  } catch {
    throw new Error(`extension ${kind} does not exist: ${entry}`);
  }
}

function text(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function contributions(manifest: ExtensionManifest): string[] {
  return [
    ...(manifest.styles ?? []).map((entry) => `style:${entry}`),
    ...(manifest.themes ?? []).map((theme) => `theme:${theme.id}`),
  ];
}
