import { pathToFileURL } from "node:url";

import type { BunPlugin } from "bun";
import { coreModules, coreModuleSource } from "@sand/extension-runtime/modules";

type Namespace = Record<string, unknown>;

const RUNTIME_REGISTRY = "sand.runtime.coreModules";

export class CoreModules {
  private constructor(private readonly runtimeModules: Map<string, Namespace>) {}

  static async load(appRoot: string): Promise<CoreModules> {
    const runtimeModules = new Map<string, Namespace>();
    for (const name of coreModules.runtime) {
      const entry = Bun.resolveSync(name, appRoot);
      runtimeModules.set(name, await import(pathToFileURL(entry).href) as Namespace);
    }
    return new CoreModules(runtimeModules);
  }

  install(): void {
    const key = Symbol.for(RUNTIME_REGISTRY);
    const target = globalThis as typeof globalThis & { [key: symbol]: unknown };
    if (target[key] !== undefined) throw new Error("runtime core modules are already installed");
    Object.defineProperty(target, key, { value: this.runtimeModules });
  }

  names(): string[] {
    return [...new Set([...coreModules.runtime, ...coreModules.ui])];
  }

  uiNames(): string[] {
    return [...coreModules.ui];
  }

  runtimePlugin(): BunPlugin {
    const modules = this.runtimeModules;
    return {
      name: "sand-runtime-core-modules",
      setup(build) {
        build.onResolve({ filter: moduleFilter(modules.keys()) }, ({ path }) => ({
          namespace: "sand-runtime-core",
          path,
        }));
        build.onLoad({ filter: /.*/u, namespace: "sand-runtime-core" }, ({ path }) => ({
          contents: bridgeSource(path, modules.get(path)),
          loader: "js",
        }));
      },
    };
  }
}

function bridgeSource(name: string, module: Namespace | undefined): string {
  if (!module) throw new Error(`unknown runtime core module: ${name}`);
  return coreModuleSource(RUNTIME_REGISTRY, name, Object.keys(module));
}

function moduleFilter(names: Iterable<string>): RegExp {
  return new RegExp(`^(?:${[...names].map(escapeRegex).join("|")})$`, "u");
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

