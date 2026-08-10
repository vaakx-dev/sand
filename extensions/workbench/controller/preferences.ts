import type { JsonValue } from "@sand/extension-api";

import { ControllerRuntime } from "./runtime.ts";

export class PreferencesController {
  constructor(private readonly runtime: ControllerRuntime) {}

  saveLayout(): Promise<void> {
    const state = this.runtime.state;
    return this.runtime.save([
      ["workbench.sidebarWidth", state.sidebarWidth.get()],
      ["workbench.right_width", state.rightWidth.get()],
      ["workbench.sidebarOpen", state.sidebarOpen.get()],
      ["workbench.right_open", state.rightOpen.get()],
      ["workbench.right_maximized", state.rightMaximized.get()],
      ["workbench.terminal_height", state.terminalHeight.get()],
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
      ["workbench.word_wrap", state.wordWrap.get()],
      ["workbench.auto_open_tasks", state.autoOpenTasks.get()],
      ["workbench.autoSettleDays", state.autoSettleDays.get()],
    ];
    return this.runtime.save(values);
  }

  async reloadExtensions(): Promise<void> {
    await this.runtime.guard(async () => {
      await this.runtime.call("extensions.reload");
      globalThis.location.reload();
    });
  }
}
