import * as extensionApi from "@sand/extension-api";
import {
  coreModules,
  coreModuleSource,
  type UiCoreModule,
} from "@sand/extension-runtime/modules";
import * as vrui from "@vaakx-dev/vrui";
import * as icons from "lucide";

type Namespace = Record<string, unknown>;

const REGISTRY = "sand.ui.coreModules";

const namespaces: Record<UiCoreModule, Namespace> = {
  "@sand/extension-api": extensionApi,
  "@vaakx-dev/vrui": vrui,
  lucide: icons,
};

const modules = new Map<UiCoreModule, Namespace>();
for (const name of coreModules.ui) modules.set(name, namespaces[name]);

export class CoreModules {
  private readonly urls = new Map<string, string>();

  constructor() {
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
