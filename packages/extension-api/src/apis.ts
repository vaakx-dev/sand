import type { ExtensionManifest, ExtensionTarget } from "./extension.ts";

export interface ExtensionApis {
  provide<T>(name: string, api: T): () => void;
  get<T>(name: string): T;
}

interface Entry {
  owner: string;
  value: unknown;
}

export class ExtensionApiRegistry {
  private readonly values = new Map<string, Entry>();

  context(
    manifest: ExtensionManifest,
    target: ExtensionTarget,
    provided: ReadonlySet<string>,
  ): ExtensionApis {
    return {
      provide: <T>(name: string, api: T) => this.provide(manifest, target, provided, name, api),
      get: <T>(name: string) => this.get<T>(manifest, name),
    };
  }

  remove(owner: string): void {
    for (const [name, entry] of this.values) {
      if (entry.owner === owner) this.values.delete(name);
    }
  }

  clear(): void {
    this.values.clear();
  }

  private provide<T>(
    manifest: ExtensionManifest,
    target: ExtensionTarget,
    provided: ReadonlySet<string>,
    name: string,
    api: T,
  ): () => void {
    const contribution = manifest.provides?.[name];
    if (!contribution || contribution.target !== target) {
      throw new Error(`${manifest.id} does not provide API ${name} for ${target}`);
    }
    if (!provided.has(name)) return () => undefined;
    if (this.values.has(name)) throw new Error(`extension API already provided: ${name}`);
    const entry = { owner: manifest.id, value: api };
    this.values.set(name, entry);
    return () => {
      if (this.values.get(name) === entry) this.values.delete(name);
    };
  }

  private get<T>(manifest: ExtensionManifest, name: string): T {
    if (!manifest.uses?.includes(name)) {
      throw new Error(`${manifest.id} does not declare API ${name}`);
    }
    const entry = this.values.get(name);
    if (!entry) throw new Error(`extension API is unavailable: ${name}`);
    return entry.value as T;
  }
}
