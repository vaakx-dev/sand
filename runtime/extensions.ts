import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  errorMessage,
  type ExtensionDescription,
  type HostExtension,
  type JsonValue,
  type UiBundle,
} from "@sand/extension-api";

import { ExtensionBundles } from "./extensionBundles.ts";
import {
  discoverExtensions,
  type ExtensionRoot,
  type LoadedExtension,
} from "./extensionFiles.ts";
import { Registry } from "./registry.ts";
import { Settings } from "./settings.ts";

export class ExtensionManager {
  private extensions = new Map<string, LoadedExtension>();
  private readonly bundles: ExtensionBundles;

  constructor(
    private readonly roots: ExtensionRoot[],
    cache: string,
    private readonly settings: Settings,
    private readonly registry: Registry,
  ) {
    this.bundles = new ExtensionBundles(cache);
  }

  async reload(): Promise<ExtensionDescription[]> {
    await this.deactivate();
    this.registry.clear();
    this.extensions = await discoverExtensions(this.roots, this.disabledIds());

    for (const extension of this.extensions.values()) {
      if (!extension.enabled || !extension.manifest.main) continue;
      await this.activate(extension);
    }
    return this.list();
  }

  list(): ExtensionDescription[] {
    return [...this.extensions.values()].map((extension) => ({
      ...extension.manifest,
      root: extension.root,
      source: extension.source,
      enabled: extension.enabled,
      hostActive: extension.hostActive,
      uiActive: extension.uiActive,
      contributions: [...extension.contributions],
    }));
  }

  async uiBundles(): Promise<UiBundle[]> {
    const bundles: UiBundle[] = [];
    for (const extension of this.extensions.values()) {
      if (!extension.enabled || (!extension.manifest.ui && !extension.manifest.styles?.length)) {
        continue;
      }
      bundles.push({
        manifest: extension.manifest,
        source: extension.manifest.ui ? await this.bundles.ui(extension) : undefined,
        styles: await this.bundles.styles(extension),
        fingerprint: extension.fingerprint,
      });
      extension.uiActive = true;
    }
    return bundles;
  }

  private async activate(extension: LoadedExtension): Promise<void> {
    const entry = resolve(extension.root, extension.manifest.main!);
    try {
      const imported = (await import(
        `${pathToFileURL(entry).href}?sand=${extension.fingerprint}`
      )) as { default?: HostExtension } & Partial<HostExtension>;
      const module = (imported.default ?? imported) as HostExtension;
      if (typeof module.activate !== "function") {
        throw new Error(`${extension.manifest.id} does not export activate()`);
      }
      await module.activate(this.registry.context(extension.manifest, extension.contributions));
      extension.module = module;
      extension.hostActive = true;
    } catch (error) {
      extension.contributions.push(`error:${errorMessage(error)}`);
    }
  }

  private async deactivate(): Promise<void> {
    for (const extension of this.extensions.values()) {
      await extension.module?.deactivate?.();
    }
  }

  private disabledIds(): Set<string> {
    return new Set(
      this.settings
        .get<JsonValue[]>("extensions.disabled", [])
        .filter((value): value is string => typeof value === "string"),
    );
  }
}
