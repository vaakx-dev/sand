import {
  errorMessage,
  type JsonObject,
  type JsonValue,
  type UiExtensionContext,
} from "@sand/extension-api";

import type { WorkbenchState } from "../state.ts";

export class ControllerRuntime {
  constructor(
    readonly context: UiExtensionContext,
    readonly state: WorkbenchState,
  ) {}

  call<T = JsonValue>(method: string, params: JsonValue = null): Promise<T> {
    return this.context.runtime.call<T>(method, params);
  }

  command<T = JsonValue>(id: string, params: JsonValue = null): Promise<T> {
    return this.call<T>("commands.execute", { id, params });
  }

  async save(values: [string, JsonValue][]): Promise<void> {
    for (const [key, value] of values) {
      await this.call("settings.set", { key, value });
    }
  }

  async saveOne(key: string, value: JsonValue): Promise<JsonObject> {
    return this.call<JsonObject>("settings.set", { key, value });
  }

  async guard(task: () => Promise<void>): Promise<void> {
    try {
      await task();
    } catch (error) {
      this.notice(errorMessage(error));
    }
  }

  notice(message: string): void {
    this.state.notice.set(message);
  }
}
