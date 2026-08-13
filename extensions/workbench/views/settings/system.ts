import { div, icon, list, span } from "@vaakx-dev/vrui";
import { RotateCw } from "lucide";

import type { SandUi } from "sand:api/ui";
import { styled } from "sand:api/ui";
import { tokens } from "sand:api/ui";
import type { WorkbenchController } from "../../controller.ts";
import type { WorkbenchState } from "../../state.ts";
import { page, settingRow } from "./shared.ts";

const List = styled(div, { display: "flex", flexDirection: "column" });
const Row = styled(div, {
  minHeight: tokens.size.header,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: tokens.space.large,
  borderBottom: "1px solid var(--border)",
});

const Key = styled(span, {
  padding: `${tokens.space.compact}px ${tokens.space.small}px`,
  border: "1px solid var(--border)",
  borderRadius: tokens.radius.compact,
  color: "var(--muted)",
  font: `${tokens.font.caption}px var(--mono)`,
});

const ExtensionCopy = styled(div, { minWidth: 0, display: "flex", flexDirection: "column", gap: tokens.space.compact });
const ExtensionName = styled(span, { color: "var(--text)" });
const ExtensionId = styled(span, { color: "var(--muted)", fontSize: tokens.font.caption });

export function keybindingsPage(state: WorkbenchState, ui: SandUi): HTMLElement {
  return page(
    ui,
    "Keybindings",
    list(
      state.commands,
      (command) => command.id,
      (command) => Row(
        {},
        span(command.prop("label")),
        Key({}, command.map((value) => value.keybinding || "Not assigned")),
      ),
      List({}),
    ),
  );
}

export function extensionsPage(
  controller: WorkbenchController,
  state: WorkbenchState,
  ui: SandUi,
): HTMLElement {
  return page(
    ui,
    "Extensions",
    settingRow(
      ui,
      "Runtime extensions",
      `${state.extensions.get().length} extensions are loaded from TypeScript at runtime.`,
      ui.button(
        {
          busy: state.extensionsReloading,
          disabled: state.extensionsReloading,
          onClick: () => void controller.preferences.reloadExtensions(),
        },
        icon(RotateCw, ui.tokens.size.iconTiny),
        "Reload",
      ),
    ),
    list(
      state.extensions,
      (extension) => extension.id,
      (extension) => Row(
        {},
        ExtensionCopy(
          {},
          ExtensionName({}, extension.prop("name")),
          ExtensionId({}, extension.prop("id")),
        ),
        ui.badge({ label: extension.prop("source") }),
      ),
      List({}),
    ),
  );
}
