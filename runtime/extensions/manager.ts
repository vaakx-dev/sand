import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  errorMessage,
  type ExtensionDescription,
  type HostExtension,
  type JsonValue,
  type UiBundle,
} from "@sand/extension-api";

import { Settings } from "../settings.ts";
import { Bundles } from "./bundles.ts";
import { discover, type Loaded, type Root } from "./discovery.ts";
import { order } from "./order.ts";
import { Registry } from "./registry.ts";

export class Manager {
  private extensions = new Map<string, Loaded>();
  private readonly bundles: Bundles;

  constructor(
    private readonly roots: Root[],
    cache: string,
    private readonly settings: Settings,
    private readonly registry: Registry,
  ) {
    this.bundles = new Bundles(cache);
  }

  async reload(): Promise<ExtensionDescription[]> {
    await this.deactivate();
    this.registry.clear();
    this.extensions = await discover(this.roots, this.disabledIds());

    for (const extension of this.activationOrder()) {
      if (!extension.enabled || !extension.manifest.main) continue;
      if (!this.dependenciesReady(extension)) continue;
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
    for (const extension of this.activationOrder()) {
      if (!extension.enabled || (!extension.manifest.ui && !extension.manifest.styles?.length)) {
        continue;
      }
      if (!this.dependenciesReady(extension)) continue;
      try {
        await this.bundles.prune(extension);
        bundles.push({
          manifest: extension.manifest,
          source: extension.manifest.ui ? await this.bundles.ui(extension) : undefined,
          styles: await this.bundles.styles(extension),
          fingerprint: extension.fingerprint,
        });
        extension.uiActive = true;
      } catch (error) {
        extension.uiActive = false;
        this.recordError(extension, errorMessage(error));
      }
    }
    return bundles;
  }

  private async activate(extension: Loaded): Promise<void> {
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
      this.recordError(extension, errorMessage(error));
    }
  }

  private async deactivate(): Promise<void> {
    for (const extension of [...this.activationOrder()].reverse()) {
      await extension.module?.deactivate?.();
    }
  }

  private activationOrder(): Loaded[] {
    const { ordered, errors } = order(this.extensions);
    for (const [id, message] of errors) this.block(this.extensions.get(id)!, message);
    return ordered;
  }

  private dependenciesReady(extension: Loaded): boolean {
    if (extension.dependencyError) return false;
    const failed = (extension.manifest.requires ?? []).find((id) => {
      const dependency = this.extensions.get(id);
      return dependency?.manifest.main && !dependency.hostActive;
    });
    if (!failed) return true;
    this.block(extension, `required extension failed to activate: ${failed}`);
    return false;
  }

  private block(extension: Loaded, message: string): void {
    if (extension.dependencyError === message) return;
    extension.dependencyError = message;
    this.recordError(extension, message);
  }

  private recordError(extension: Loaded, message: string): void {
    const contribution = `error:${message}`;
    if (!extension.contributions.includes(contribution)) {
      extension.contributions.push(contribution);
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
