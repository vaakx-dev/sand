import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { JsonObject, JsonValue, SettingsApi } from "@sand/extension-api";

export class Settings implements SettingsApi {
  private constructor(
    private readonly path: string,
    private values: JsonObject,
  ) {}

  static async load(path: string): Promise<Settings> {
    try {
      const values = JSON.parse(await readFile(path, "utf8")) as JsonObject;
      return new Settings(path, values);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      return new Settings(path, {});
    }
  }

  get<T extends JsonValue>(key: string, fallback: T): T {
    return (this.values[key] as T | undefined) ?? fallback;
  }

  all(): JsonObject {
    return structuredClone(this.values);
  }

  async set(key: string, value: JsonValue): Promise<void> {
    this.values = { ...this.values, [key]: structuredClone(value) };
    await mkdir(dirname(this.path), { recursive: true });
    const temporary = `${this.path}.next`;
    await writeFile(temporary, `${JSON.stringify(this.values, null, 2)}\n`, "utf8");
    await rename(temporary, this.path);
  }
}
