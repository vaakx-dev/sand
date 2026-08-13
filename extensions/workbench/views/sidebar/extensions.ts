import { div, icon, list, span } from "@vaakx-dev/vrui";
import { RotateCw } from "lucide";

import type { ExtensionDescription } from "@sand/extension-api";
import type { SandUi } from "sand:api/ui";
import { styled } from "sand:api/ui";
import type { WorkbenchController } from "../../controller.ts";
import type { WorkbenchState } from "../../state.ts";
import { sidebarView } from "./shared.ts";

const Extensions = styled(div, { minHeight: 0, flex: 1, overflow: "auto" });
const Extension = styled(div, {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-small)",
  padding: "var(--space-medium)",
  borderBottom: "1px solid var(--border)",
});
const Name = styled(div, {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--space-small)",
  fontWeight: "var(--weight-semibold)",
});
const Meta = styled(div, { color: "var(--muted)", fontSize: "var(--font-caption)" });
const Contributions = styled(div, {
  color: "var(--muted)",
  font: "var(--font-caption)/1.5 var(--mono)",
  overflowWrap: "anywhere",
});

export function extensionsView(
  controller: WorkbenchController,
  state: WorkbenchState,
  ui: SandUi,
): HTMLElement {
  return sidebarView(
    "Extensions",
    ui.iconButton({
      label: "Reload extensions",
      renderIcon: (size) => icon(RotateCw, size),
      busy: state.extensionsReloading,
      disabled: state.extensionsReloading,
      onClick: () => void controller.preferences.reloadExtensions(),
    }),
    list(
      state.extensions,
      (extension) => extension.id,
      (extension) => extensionRow(extension.get(), ui),
      Extensions({}),
    ),
  );
}

function extensionRow(extension: ExtensionDescription, ui: SandUi): HTMLElement {
  return Extension(
    {},
    Name({}, span(extension.name), ui.badge({ label: extension.source })),
    Meta({}, `${extension.id} / ${extension.version}`),
    Contributions({}, extensionDetail(extension)),
  );
}

function extensionDetail(extension: ExtensionDescription): string {
  if (extension.errors.length) return extension.errors.join(" / ");
  if (extension.contributions.length) return extension.contributions.join(" / ");
  return "UI extension";
}
