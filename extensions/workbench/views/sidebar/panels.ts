import { button, div, icon, list, span } from "@vaakx-dev/vrui";
import { RefreshCw } from "lucide";

import type { ExtensionDescription } from "@sand/extension-api";

import type { WorkbenchController } from "../../controller.ts";
import type { WorkbenchState } from "../../state.ts";
import { panelHeader } from "./shared.ts";

export function extensionsView(
  controller: WorkbenchController,
  state: WorkbenchState,
): HTMLElement {
  return div(
    { class: "sidebar-view" },
    panelHeader(
      "Extensions",
      button(
        {
          class: "sidebar-menu-icon",
          "aria-label": "Reload extensions",
          "data-tooltip": "Reload extensions",
          onClick: () => void controller.preferences.reloadExtensions(),
        },
        icon(RefreshCw, 14),
      ),
    ),
    list(
      state.extensions,
      (extension) => extension.id,
      (extension) => extensionRow(extension.get()),
      div({ class: "panel-scroll" }),
    ),
  );
}

function extensionRow(extension: ExtensionDescription): HTMLElement {
  return div(
    { class: "extension-row" },
    div(
      { class: "extension-name" },
      span(extension.name),
      span({ class: "badge" }, extension.source),
    ),
    div({ class: "extension-meta" }, `${extension.id} · ${extension.version}`),
    div(
      { class: "extension-contributions" },
      extension.contributions.length ? extension.contributions.join(" · ") : "UI extension",
    ),
  );
}
