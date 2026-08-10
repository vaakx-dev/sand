import { button, div, icon, list, span } from "@vaakx-dev/vrui";
import { RefreshCw } from "lucide";

import type { WorkbenchController } from "../../controller.ts";
import type { WorkbenchState } from "../../state.ts";
import { page, settingRow } from "./shared.ts";

export function keybindingsPage(state: WorkbenchState): HTMLElement {
  return page(
    "Keybindings",
    list(
      state.commands,
      (command) => command.id,
      (command) => div(
        { class: "keybinding-row" },
        span(command.prop("label")),
        span(
          { class: "keybinding" },
          command.map((value) => value.keybinding || "Not assigned"),
        ),
      ),
      div({ class: "settings-list" }),
    ),
  );
}

export function extensionsPage(
  controller: WorkbenchController,
  state: WorkbenchState,
): HTMLElement {
  return page(
    "Extensions",
    settingRow(
      "Runtime extensions",
      `${state.extensions.get().length} extensions are loaded from TypeScript and CSS at runtime.`,
      button(
        {
          class: "secondary-button",
          onClick: () => void controller.preferences.reloadExtensions(),
        },
        icon(RefreshCw, 12),
        "Reload",
      ),
    ),
    list(
      state.extensions,
      (extension) => extension.id,
      (extension) => div(
        { class: "settings-extension-row" },
        div(
          span({ class: "settings-extension-name" }, extension.prop("name")),
          span({ class: "settings-extension-id" }, extension.prop("id")),
        ),
        span({ class: "badge" }, extension.prop("source")),
      ),
      div({ class: "settings-list" }),
    ),
  );
}
