import { div, icon, list, span } from "@vaakx-dev/vrui";
import { RefreshCw } from "lucide";

import type { ExtensionDescription, UiControls } from "@sand/extension-api";

import type { WorkbenchController } from "../../controller.ts";
import type { WorkbenchState } from "../../state.ts";
import { sidebarHeader } from "./shared.ts";

export function extensionsView(
  controller: WorkbenchController,
  state: WorkbenchState,
  controls: UiControls,
): HTMLElement {
  return div(
    { class: "sidebar-view" },
    sidebarHeader(
      "Extensions",
      controls.iconButton({
        label: "Reload extensions",
        renderIcon: (size) => icon(RefreshCw, size),
        onClick: () => void controller.preferences.reloadExtensions(),
      }),
    ),
    list(
      state.extensions,
      (extension) => extension.id,
      (extension) => extensionRow(extension.get()),
      div({ class: "extension-list" }),
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
    div({ class: "extension-meta" }, `${extension.id} / ${extension.version}`),
    div(
      { class: "extension-contributions" },
      extension.contributions.length ? extension.contributions.join(" / ") : "UI extension",
    ),
  );
}
