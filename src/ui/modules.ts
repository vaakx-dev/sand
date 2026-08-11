import * as extensionApi from "@sand/extension-api";
import { coreModuleSource } from "@sand/extension-api/coreModule";
import * as vrui from "@vaakx-dev/vrui";
import * as icons from "lucide";

import configuration from "../../runtime/coreModules.json";

type Namespace = Record<string, unknown>;

const REGISTRY = "sand.ui.coreModules";

const modules = new Map<string, Namespace>([
  ["@sand/extension-api", extensionApi],
  ["@vaakx-dev/vrui", vrui],
  ["lucide", icons],
]);

export class CoreModules {
  private readonly urls = new Map<string, string>();

  constructor() {
    validateConfiguration();
    installRegistry();
    for (const [name, module] of modules) {
      const source = coreModuleSource(REGISTRY, name, Object.keys(module));
      this.urls.set(name, URL.createObjectURL(new Blob([source], { type: "text/javascript" })));
    }
  }

  link(source: string): string {
    let linked = source;
    for (const [name, url] of this.urls) linked = linkImports(linked, name, url);
    return linked;
  }
}

function validateConfiguration(): void {
  const configured = configuration.ui;
  if (
    !Array.isArray(configured)
    || configured.length !== modules.size
    || configured.some((name) => !modules.has(name))
  ) {
    throw new Error("browser core modules do not match runtime/coreModules.json");
  }
}

function installRegistry(): void {
  const key = Symbol.for(REGISTRY);
  const target = globalThis as typeof globalThis & { [key: symbol]: unknown };
  if (target[key] !== undefined) throw new Error("browser core modules are already installed");
  Object.defineProperty(target, key, { value: modules });
}

function linkImports(source: string, name: string, url: string): string {
  const escaped = escapeRegex(name);
  const replacement = JSON.stringify(url);
  return source
    .replace(new RegExp(`(\\bfrom\\s*)["']${escaped}["']`, "gu"), `$1${replacement}`)
    .replace(new RegExp(`(\\bimport\\s*)["']${escaped}["']`, "gu"), `$1${replacement}`)
    .replace(
      new RegExp(`(\\bimport\\s*\\(\\s*)["']${escaped}["'](\\s*\\))`, "gu"),
      `$1${replacement}$2`,
    );
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
