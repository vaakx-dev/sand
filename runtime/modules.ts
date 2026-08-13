import { pathToFileURL } from "node:url";

import type { BunPlugin } from "bun";
import { coreModules, coreModuleSource } from "@sand/extension-runtime/modules";

type Namespace = Record<string, unknown>;

const HOST_REGISTRY = "sand.host.coreModules";

export class CoreModules {
  private constructor(private readonly hostModules: Map<string, Namespace>) {}

  static async load(appRoot: string): Promise<CoreModules> {
    const hostModules = new Map<string, Namespace>();
    for (const name of coreModules.host) {
      const entry = Bun.resolveSync(name, appRoot);
      hostModules.set(name, await import(pathToFileURL(entry).href) as Namespace);
    }
    return new CoreModules(hostModules);
  }

  install(): void {
    const key = Symbol.for(HOST_REGISTRY);
    const target = globalThis as typeof globalThis & { [key: symbol]: unknown };
    if (target[key] !== undefined) throw new Error("host core modules are already installed");
    Object.defineProperty(target, key, { value: this.hostModules });
  }

  names(): string[] {
    return [...new Set([...coreModules.host, ...coreModules.ui])];
  }

  uiNames(): string[] {
    return [...coreModules.ui];
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

