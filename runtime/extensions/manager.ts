import {
  ExtensionApiRegistry,
  errorMessage,
  type ExtensionDescription,
  type HostExtension,
  type JsonValue,
  type UiBundle,
} from "@sand/extension-api";

import { CoreModules } from "../modules.ts";
import { Settings } from "../settings.ts";
import { Bundles } from "./bundles.ts";
import { Dependencies } from "./dependencies.ts";
import { discover, type Loaded, type Root } from "./discovery.ts";
import { order } from "./order.ts";
import { Registry } from "./registry.ts";

export class Manager {
  private extensions = new Map<string, Loaded>();
  private providers = new Map<string, Loaded>();
  private readonly bundles: Bundles;
  private readonly apis = new ExtensionApiRegistry();

  constructor(
    private readonly roots: Root[],
    core: CoreModules,
    private readonly settings: Settings,
    private readonly registry: Registry,
    private readonly dependencies: Dependencies,
  ) {
    this.bundles = new Bundles(core);
  }

  async reload(): Promise<ExtensionDescription[]> {
    await this.deactivate();
    this.apis.clear();
    this.registry.clear();
    this.extensions = await discover(this.roots, this.disabledIds());

    const ordered = this.activationOrder();
    for (const extension of ordered) {
      if (!extension.enabled) continue;
      try {
        await this.dependencies.prepare(extension);
      } catch (error) {
        this.block(extension, errorMessage(error));
      }
    }

    for (const extension of ordered) {
      if (!extension.enabled || !extension.manifest.main) continue;
      if (!this.dependenciesReady(extension)) continue;
      await this.activate(extension);
    }
    return this.list();
  }

  async close(): Promise<void> {
    await this.deactivate();
    this.registry.clear();
    this.extensions.clear();
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
      errors: [...extension.errors],
    }));
  }

  async uiBundles(): Promise<UiBundle[]> {
    const bundles: UiBundle[] = [];
    for (const extension of this.activationOrder()) {
      if (!extension.enabled || !extension.manifest.ui) {
        continue;
      }
      if (!this.dependenciesReady(extension)) continue;
      try {
        bundles.push({
          manifest: extension.manifest,
          source: await this.bundles.ui(extension, this.providers),
          bindings: this.uiBindings(extension),
          provided: this.providedBy(extension, "ui"),
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
    let url: string | undefined;
    try {
      const source = await this.bundles.host(extension, this.providers);
      url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
      const imported = (await import(url)) as {
        default?: HostExtension;
      } & Partial<HostExtension>;
      const module = (imported.default ?? imported) as HostExtension;
      if (typeof module.activate !== "function") {
        throw new Error(`${extension.manifest.id} does not export activate()`);
      }
      const cleanup = await module.activate(
        this.registry.context(
          extension.manifest,
          extension.contributions,
          this.apis.context(
            extension.manifest,
            "host",
            new Set(this.providedBy(extension, "host")),
          ),
        ),
      );
      extension.cleanup = cleanup ?? undefined;
      extension.hostActive = true;
    } catch (error) {
      this.recordError(extension, errorMessage(error));
    } finally {
      if (url) URL.revokeObjectURL(url);
    }
  }

  private async deactivate(): Promise<void> {
    for (const extension of [...this.activationOrder()].reverse()) {
      try {
        await extension.cleanup?.();
      } catch (error) {
        const message = `cleanup failed: ${errorMessage(error)}`;
        this.recordError(extension, message);
        console.error(`${extension.manifest.id}: ${message}`);
      } finally {
        extension.cleanup = undefined;
        extension.hostActive = false;
        this.apis.remove(extension.manifest.id);
      }
    }
  }

  private activationOrder(): Loaded[] {
    const { ordered, errors, providers } = order(this.extensions, this.apiSelections());
    this.providers = providers;
    for (const [id, message] of errors) this.block(this.extensions.get(id)!, message);
    return ordered;
  }

  private dependenciesReady(extension: Loaded): boolean {
    if (extension.blocked) return false;
    const failed = (extension.manifest.uses ?? []).find((name) => {
      const provider = this.providers.get(name);
      const contribution = provider?.manifest.provides?.[name];
      return contribution?.target === "host" && provider?.manifest.main && !provider.hostActive;
    });
    if (!failed) return true;
    this.block(extension, `required API failed to activate: ${failed}`);
    return false;
  }

  private uiBindings(extension: Loaded): Record<string, string> {
    return Object.fromEntries((extension.manifest.uses ?? []).flatMap((name) => {
      const provider = this.providers.get(name);
      return provider?.manifest.provides?.[name]?.target === "ui"
        ? [[name, provider.manifest.id]]
        : [];
    }));
  }

  private providedBy(extension: Loaded, target: "host" | "ui"): string[] {
    return [...this.providers].flatMap(([name, provider]) => (
      provider === extension && provider.manifest.provides?.[name]?.target === target
        ? [name]
        : []
    ));
  }

  private apiSelections(): Map<string, string> {
    const value = this.settings.get<JsonValue>("extensions.apis", {});
    if (typeof value !== "object" || value === null || Array.isArray(value)) return new Map();
    return new Map(Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ));
  }

  private block(extension: Loaded, message: string): void {
    if (extension.blocked === message) return;
    extension.blocked = message;
    this.recordError(extension, message);
  }

  private recordError(extension: Loaded, message: string): void {
    if (!extension.errors.includes(message)) extension.errors.push(message);
  }

  private disabledIds(): Set<string> {
    return new Set(
      this.settings
        .get<JsonValue[]>("extensions.disabled", [])
        .filter((value): value is string => typeof value === "string"),
    );
  }
}
