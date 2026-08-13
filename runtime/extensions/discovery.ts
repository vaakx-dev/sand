import { readdir, stat } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

import {
  errorMessage,
  type ExtensionDescription,
  type ExtensionManifest,
  type ExtensionCleanup,
} from "@sand/extension-api";
import { missing, readJson } from "@sand/extension-runtime";

export interface Loaded {
  manifest: ExtensionManifest;
  root: string;
  source: ExtensionDescription["source"];
  enabled: boolean;
  entryActive: boolean;
  uiActive: boolean;
  contributions: string[];
  errors: string[];
  blocked?: string;
  cleanup?: ExtensionCleanup;
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
          enabled: !disabled.has(manifest.id),
          entryActive: false,
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
  if (manifest.app !== undefined) await validateFile(root, manifest.app, "app", path);
  if (manifest.ui !== undefined) await validateFile(root, manifest.ui, "ui", path);
  if (
    manifest.uses !== undefined
    && (
      !Array.isArray(manifest.uses)
      || manifest.uses.some((name) => !apiName(name))
      || new Set(manifest.uses).size !== manifest.uses.length
    )
  ) throw new Error(`invalid extension API uses: ${path}`);
  if (manifest.provides !== undefined) {
    if (!record(manifest.provides)) throw new Error(`invalid extension API providers: ${path}`);
    for (const [name, contribution] of Object.entries(manifest.provides)) {
      if (
        !apiName(name)
        || !record(contribution)
        || !["app", "ui"].includes(contribution.target)
      ) throw new Error(`invalid extension API provider ${name || "<empty>"}: ${path}`);
      if (contribution.target === "app" && !manifest.app) {
        throw new Error(`app API provider requires an app entry: ${name}`);
      }
      if (contribution.target === "ui" && !manifest.ui) {
        throw new Error(`UI API provider requires a UI entry: ${name}`);
      }
      await validateFile(root, contribution.module, `API ${name}`, path);
    }
  }
  if (manifest.uses?.some((name) => manifest.provides?.[name])) {
    throw new Error(`extension cannot use an API it provides: ${path}`);
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

function apiName(value: unknown): value is string {
  return text(value) && /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/u.test(value);
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function contributions(manifest: ExtensionManifest): string[] {
  return [
    ...Object.keys(manifest.provides ?? {}).map((name) => `api:${name}`),
    ...(manifest.themes ?? []).map((theme) => `theme:${theme.id}`),
  ];
}
