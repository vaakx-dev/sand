import type { JsonObject, JsonValue, SettingsApi } from "@sand/extension-api";
import { readJson, writeJson } from "@sand/extension-runtime";

export class Settings implements SettingsApi {
  private pending = Promise.resolve();

  private constructor(
    private readonly path: string,
    private values: JsonObject,
  ) {}

  static async load(path: string): Promise<Settings> {
    return new Settings(path, await readJson<JsonObject>(path) ?? {});
  }

  get<T extends JsonValue>(key: string, fallback: T): T {
    return (this.values[key] as T | undefined) ?? fallback;
  }

  all(): JsonObject {
    return structuredClone(this.values);
  }

  async set(key: string, value: JsonValue): Promise<void> {
    this.values = { ...this.values, [key]: structuredClone(value) };
    const snapshot = structuredClone(this.values);
    this.pending = this.pending.catch(() => undefined).then(() => writeJson(this.path, snapshot));
    await this.pending;
  }
}
