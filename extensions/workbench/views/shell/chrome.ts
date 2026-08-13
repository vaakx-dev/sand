import { div, icon, span } from "@vaakx-dev/vrui";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { FolderOpen, Minus, PanelLeft, Square, X } from "lucide";

import type { SandUi } from "sand:api/ui";
import { styled } from "sand:api/ui";
import { workbenchSlots, type UiSlotRegistry } from "../../api.ts";
import type { WorkbenchController } from "../../controller.ts";
import type { WorkbenchState } from "../../state.ts";
import { projectName } from "../format.ts";
import { mountUiSlot } from "../shared/slot.ts";

const AppHeader = styled(div, {
  gridColumn: "1 / 4",
  gridRow: 1,
  position: "relative",
  zIndex: "var(--z-chrome)",
  width: "calc(100% - var(--window-controls-width) - var(--window-action-inset) - var(--layout-actions-width) - var(--space-compact))",
  minWidth: 0,
  display: "grid",
  gridTemplateColumns: "var(--workbench-brand-width) var(--workbench-sidebar-grip) minmax(0, 1fr)",
  background: "var(--background)",
  "[data-workbench][data-auxiliary-open=true] &": { width: "100%" },
});
const Brand = styled(div, {
  minWidth: 0,
  height: "var(--header-height)",
  display: "flex",
  alignItems: "center",
  gap: "var(--space-medium)",
  padding: "0 var(--space-medium)",
  overflow: "hidden",
  "[data-sidebar-open=true] &": {
    borderRight: "1px solid var(--border)",
    borderBottom: "1px solid var(--border)",
    background: "var(--panel)",
  },
});
const Wordmark = styled(span, { flex: "0 0 auto", color: "var(--text)", fontSize: "var(--font-body)", fontWeight: "var(--weight-bold)" });
const Project = styled(span, { color: "var(--muted)" });
const Grip = styled(div, { minWidth: 0, background: "var(--background)" });
const Topbar = styled(div, {
  minWidth: 0,
  height: "var(--header-height)",
  display: "flex",
  alignItems: "center",
  background: "var(--background)",
});
const Breadcrumb = styled(div, {
  minWidth: 0,
  height: "var(--control-height)",
  flex: 1,
  display: "flex",
  alignItems: "center",
  gap: "var(--space-medium)",
  paddingInline: "var(--space-medium)",
  color: "var(--muted)",
  fontSize: "var(--font-small)",
  fontWeight: "var(--weight-semibold)",
});
const ThreadTitle = styled(span, {
  minWidth: 0,
  maxWidth: 416,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  color: "var(--text)",
});
const Section = styled(span, {
  minWidth: 0,
  flex: 1,
  padding: "0 var(--space-medium)",
  color: "var(--muted)",
  fontSize: "var(--font-small)",
});
const TopActions = styled(div, {
  width: "max-content",
  flex: "0 0 auto",
  height: "var(--control-height)",
  display: "flex",
  alignItems: "center",
  gap: "var(--space-compact)",
});
const TopActionsSlot = styled(div, {
  width: "max-content",
  flex: "0 0 auto",
  display: "flex",
  alignItems: "center",
  gap: "var(--space-compact)",
});
const WindowControls = styled(div, {
  position: "fixed",
  top: 0,
  right: 0,
  zIndex: "var(--z-window)",
  height: "var(--header-height)",
  display: "flex",
  alignItems: "stretch",
});

export function windowControls(ui: SandUi): HTMLElement {
  const window = getCurrentWindow();
  return WindowControls(
    {},
    ui.iconButton({ label: "Minimize", variant: "window", renderIcon: (size) => icon(Minus, size), onClick: () => void window.minimize() }),
    ui.iconButton({ label: "Maximize", variant: "window", renderIcon: (size) => icon(Square, size), onClick: () => void window.toggleMaximize() }),
    ui.iconButton({ label: "Close", variant: "window", tone: "danger", renderIcon: (size) => icon(X, size), onClick: () => void window.close() }),
  );
}

export function header(
  controller: WorkbenchController,
  state: WorkbenchState,
  slots: UiSlotRegistry,
  ui: SandUi,
): HTMLElement {
  return AppHeader(
    { "data-sidebar-open": state.sidebarOpen, "data-tauri-drag-region": "" },
    Brand(
      { "data-tauri-drag-region": "" },
      ui.iconButton({
        label: "Toggle sidebar",
        renderIcon: (size) => icon(PanelLeft, size),
        onClick: () => controller.toggleSidebar(),
      }),
      Wordmark(
        {
          hidden: state.sidebarOpen.map((open) => !open),
          "data-tauri-drag-region": "",
        },
        "Sand",
      ),
    ),
    Grip({ "data-tauri-drag-region": "" }),
    Topbar(
      { "data-tauri-drag-region": "" },
      Breadcrumb(
        {
          hidden: state.activity.map((activity) => activity === "settings"),
          "data-tauri-drag-region": "",
        },
        icon(FolderOpen, ui.tokens.size.iconCompact),
        Project({}, state.root.map(projectName)),
        span("/"),
        ThreadTitle({}, state.threads.current.map((id) => {
          if (!id) return "New thread";
          return state.threads.items.get().find((thread) => thread.id === id)?.title || "Thread";
        })),
      ),
      Section(
        { hidden: state.activity.map((activity) => activity !== "settings"), "data-tauri-drag-region": "" },
        "Settings",
      ),
      TopActions(
        { hidden: state.activity.map((activity) => activity === "settings") },
        TopActionsSlot({ onMount: mountUiSlot(slots, workbenchSlots.topbarActions) }),
      ),
    ),
  );
}
