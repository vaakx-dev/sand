import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import type { BunPlugin } from "bun";
import { coreModuleSource } from "@sand/extension-api/coreModule";

type Namespace = Record<string, unknown>;

interface Configuration {
  host: string[];
  ui: string[];
}

const HOST_REGISTRY = "sand.host.coreModules";

export class CoreModules {
  private constructor(
    private readonly configuration: Configuration,
    private readonly hostModules: Map<string, Namespace>,
  ) {}

  static async load(appRoot: string): Promise<CoreModules> {
    const path = join(appRoot, "runtime", "coreModules.json");
    const source = await readFile(path, "utf8");
    const configuration = configurationValue(JSON.parse(source) as unknown, path);
    const hostModules = new Map<string, Namespace>();
    for (const name of configuration.host) {
      const entry = Bun.resolveSync(name, appRoot);
      hostModules.set(name, await import(pathToFileURL(entry).href) as Namespace);
    }
    return new CoreModules(configuration, hostModules);
  }

  install(): void {
    const key = Symbol.for(HOST_REGISTRY);
    const target = globalThis as typeof globalThis & { [key: symbol]: unknown };
    if (target[key] !== undefined) throw new Error("host core modules are already installed");
    Object.defineProperty(target, key, { value: this.hostModules });
  }

  names(): string[] {
    return [...new Set([...this.configuration.host, ...this.configuration.ui])];
  }

  uiNames(): string[] {
    return [...this.configuration.ui];
  }

  hostPlugin(): BunPlugin {
    const modules = this.hostModules;
    return {
      name: "sand-host-core-modules",
      setup(build) {
        build.onResolve({ filter: moduleFilter(modules.keys()) }, ({ path }) => ({
          namespace: "sand-host-core",
          path,
        }));
        build.onLoad({ filter: /.*/u, namespace: "sand-host-core" }, ({ path }) => ({
          contents: bridgeSource(path, modules.get(path)),
          loader: "js",
        }));
      },
    };
  }
}

function configurationValue(value: unknown, path: string): Configuration {
  if (!record(value)) throw new Error(`invalid core module configuration: ${path}`);
  const host = moduleNames(value.host, path, "host");
  const ui = moduleNames(value.ui, path, "ui");
  if (host.length === 0 || ui.length === 0) {
    throw new Error(`invalid core module configuration: ${path}`);
  }
  return { host, ui };
}

function moduleNames(value: unknown, path: string, target: string): string[] {
  if (
    !Array.isArray(value)
    || value.some((name) => typeof name !== "string" || !name)
    || new Set(value).size !== value.length
  ) {
    throw new Error(`invalid ${target} core modules in ${path}`);
  }
  return value as string[];
}

function bridgeSource(name: string, module: Namespace | undefined): string {
  if (!module) throw new Error(`unknown host core module: ${name}`);
  return coreModuleSource(HOST_REGISTRY, name, Object.keys(module));
}

function moduleFilter(names: Iterable<string>): RegExp {
  return new RegExp(`^(?:${[...names].map(escapeRegex).join("|")})$`, "u");
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
