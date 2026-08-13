import type { JsonValue } from "@sand/extension-api";

import { ControllerRuntime } from "./runtime.ts";

export class PreferencesController {
  constructor(private readonly runtime: ControllerRuntime) {}

  saveLayout(): Promise<void> {
    const state = this.runtime.state;
    return this.runtime.save([
      ["workbench.sidebarWidth", state.sidebarWidth.get()],
    ]);
  }

  saveAppearance(): Promise<void> {
    const state = this.runtime.state;
    return this.runtime.save([
      ["workbench.appearance", state.appearance.get()],
      ["workbench.theme", state.theme.get()],
    ]);
  }

  saveBehavior(): Promise<void> {
    const state = this.runtime.state;
    const values: [string, JsonValue][] = [
      ["workbench.autoSettleDays", state.threads.autoSettleDays.get()],
    ];
    return this.runtime.save(values);
  }

  async reloadExtensions(): Promise<void> {
    const reloading = this.runtime.state.extensionsReloading;
    if (reloading.get()) return;

    reloading.set(true);
    let reloadStarted = false;
    await this.runtime.guard(async () => {
      await this.runtime.call("extensions.reload");
      globalThis.location.reload();
      reloadStarted = true;
    });
    if (!reloadStarted) reloading.set(false);
  }
}
