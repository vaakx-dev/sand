import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { BunPlugin } from "bun";

const configurations = new Map<string, string[]>();

export function coreModulePlugin(appRoot: string): BunPlugin {
  const entries = new Map(
    coreModules(appRoot).map((name) => [
      name,
      Bun.resolveSync(name, appRoot),
    ]),
  );
  const filter = new RegExp(`^(?:${[...entries.keys()].map(escapeRegex).join("|")})$`, "u");

  return {
    name: "sand-core-modules",
    setup(build) {
      build.onResolve({ filter }, ({ path }) => ({
        path: entries.get(path)!,
      }));
    },
  };
}

export function coreModuleNames(appRoot: string): string[] {
  return [...coreModules(appRoot)];
}

function coreModules(appRoot: string): string[] {
  const existing = configurations.get(appRoot);
  if (existing) return existing;

  const path = join(appRoot, "runtime", "coreModules.json");
  const value = JSON.parse(readFileSync(path, "utf8")) as unknown;
  if (
    !Array.isArray(value)
    || value.length === 0
    || value.some((name) => typeof name !== "string" || !name)
    || new Set(value).size !== value.length
  ) {
    throw new Error(`invalid core module configuration: ${path}`);
  }
  const modules = value as string[];
  configurations.set(appRoot, modules);
  return modules;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
