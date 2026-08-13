import { derive, div, effect, keep, onTimeout, onWindow, portal, show } from "@vaakx-dev/vrui";

import type { ThemeContribution } from "@sand/extension-api";

import type { SandUi } from "sand:api/ui";
import { workbenchSlots, type WorkbenchService } from "../api.ts";
import type { WorkbenchController } from "../controller.ts";
import type { WorkbenchState } from "../state.ts";
import { agentView } from "./agent.ts";
import { settingsWorkspace } from "./settings.ts";
import { sidebar } from "./sidebar.ts";
import { header, windowControls } from "./shell/chrome.ts";
import { paneResizer, SIDEBAR_MAX, SIDEBAR_MIN } from "./shell/resizer.ts";
import { globalKeyDown } from "./shell/shortcuts.ts";
import { renameDialog } from "./sidebar/threads/dialog.ts";
import { contextMenu } from "./sidebar/threads/menu.ts";
import { hoverCard } from "./sidebar/threads/preview.ts";
import {
  mountMeasuredUiSlot,
  mountObservedUiSlot,
  uiSlot,
} from "./shared/slot.ts";
import { styled } from "sand:api/ui";

const Workbench = styled(div, {
  width: "100%",
  height: "100%",
  display: "grid",
  gridTemplateColumns: "var(--workbench-sidebar-column) var(--workbench-sidebar-grip) minmax(0, 1fr) auto",
  gridTemplateRows: "var(--header-height) minmax(0, 1fr)",
  color: "var(--text)",
  background: "var(--background)",
});
const SidebarSlot = styled(div, {
  minWidth: 0,
  minHeight: 0,
  overflow: "hidden",
  display: "flex",
  gridColumn: 1,
  gridRow: 2,
  "> *": { minWidth: 0, minHeight: 0, flex: 1 },
});
const CenterSlot = styled(div, {
  minWidth: 0,
  minHeight: 0,
  overflow: "hidden",
  display: "flex",
  gridColumn: 3,
  gridRow: 2,
  "> *": { minWidth: 0, minHeight: 0, flex: 1 },
});
const AuxiliarySlot = styled(div, {
  minWidth: 0,
  minHeight: 0,
  overflow: "hidden",
  display: "flex",
  gridColumn: 4,
  gridRow: "1 / 3",
  "> *": { minWidth: 0, minHeight: 0 },
});
const ResizerSlot = styled(div, { minWidth: 0, minHeight: 0, gridColumn: 2, gridRow: 2 });
const Center = styled(div, {
  minWidth: 0,
  minHeight: 0,
  display: "grid",
  gridTemplateRows: "minmax(0, 1fr) auto",
});
const Main = styled(div, { minWidth: 0, minHeight: 0, display: "grid", background: "var(--background)" });
const LayoutActions = styled(div, {
  position: "fixed",
  top: "calc((var(--header-height) - var(--control-height)) / 2)",
  right: "calc(var(--window-controls-width) + var(--window-action-inset))",
  zIndex: "var(--z-window)",
  width: "max-content",
  height: "var(--control-height)",
  display: "flex",
  alignItems: "center",
  gap: "var(--space-compact)",
});
const Notice = styled(div, {
  position: "fixed",
  right: "var(--space-large)",
  bottom: "var(--header-height)",
  zIndex: "var(--z-notice)",
  maxWidth: 416,
  padding: "var(--space-medium) var(--space-large)",
  border: "1px solid var(--outline)",
  borderRadius: "var(--row-radius)",
  background: "var(--panel)",
  boxShadow: "0 12px 40px #0009",
});

export function shell(
  controller: WorkbenchController,
  state: WorkbenchState,
  ui: SandUi,
  workbench: WorkbenchService,
): HTMLElement {
  const sidebarWidth = state.sidebarWidth.map((width) => `${width}px`);
  const sidebarColumn = derive(() => state.sidebarOpen.get() ? sidebarWidth.get() : "0px");
  const sidebarGripSize = ui.tokens.space.small;
  const sidebarGrip = state.sidebarOpen.map((open) => open ? `${sidebarGripSize}px` : "0px");
  const sidebarSpace = derive(() => state.sidebarOpen.get()
    ? `${state.sidebarWidth.get() + sidebarGripSize}px`
    : "0px");
  const collapsedBrandWidth = ui.tokens.size.control + (ui.tokens.space.medium * 2);
  const brandWidth = derive(() => state.sidebarOpen.get()
    ? sidebarWidth.get()
    : `${collapsedBrandWidth}px`);

  return Workbench(
    {
      "data-workbench": "",
      style: {
        "--workbench-brand-width": brandWidth,
        "--workbench-sidebar-column": sidebarColumn,
        "--workbench-sidebar-grip": sidebarGrip,
        "--workbench-sidebar-space": sidebarSpace,
      },
      onMount: (element) => {
        const stopKeys = onWindow(
          element,
          "keydown",
          (event) => globalKeyDown(event as KeyboardEvent, controller, state),
        );
        const stopTheme = effect(() => ui.theme(
          selectedTheme(state),
          state.appearance.get(),
        ));
        return () => {
          stopKeys();
          stopTheme();
        };
      },
    },
    header(controller, state, workbench.slots, ui),
    SidebarSlot({}, sidebar(controller, state, workbench.slots, ui)),
    ResizerSlot(
      {},
      keep(state.sidebarOpen, () => paneResizer(
        "left",
        state.sidebarWidth,
        SIDEBAR_MIN,
        SIDEBAR_MAX,
        controller,
      )),
    ),
    CenterSlot(
      {},
      Center(
        {
          hidden: state.activity.map((activity) => activity === "settings"),
        },
        Main({}, agentView(controller, state, workbench.tools, ui)),
        uiSlot(workbench.slots, workbenchSlots.bottom),
      ),
      settingsWorkspace(controller, state, ui),
    ),
    AuxiliarySlot({
      onMount: mountObservedUiSlot(
        workbench.slots,
        workbenchSlots.auxiliary,
        "data-auxiliary-open",
      ),
    }),
    LayoutActions({
      hidden: state.activity.map((activity) => activity === "settings"),
      onMount: mountMeasuredUiSlot(
        workbench.slots,
        workbenchSlots.layoutActions,
        "--layout-actions-width",
      ),
    }),
    windowControls(ui),
    portal("overlays", hoverCard(state)),
    portal("overlays", contextMenu(controller, state, ui)),
    portal("overlays", renameDialog(controller, state, ui)),
    portal("overlays", uiSlot(workbench.slots, workbenchSlots.overlays)),
    portal(
      "overlays",
      show(state.notice.map(Boolean), () => Notice(
        {
          onMount: () => onTimeout(() => state.notice.set(""), 4_000),
        },
        state.notice,
      )),
    ),
  );
}

function selectedTheme(state: WorkbenchState): ThemeContribution | undefined {
  const id = state.theme.get();
  return state.extensions.get().flatMap((extension) => extension.themes ?? [])
    .find((theme) => theme.id === id);
}
