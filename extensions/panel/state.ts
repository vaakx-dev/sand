import { derive, sig } from "@vaakx-dev/vrui";

import type { PanelTab } from "./models.ts";
import type { UiSurfaceContribution } from "sand:api/workbench";

export const PANEL_MIN_WIDTH = 320;
export const PANEL_MAX_WIDTH = 896;
export const PANEL_DEFAULT_WIDTH = 432;

export function normalizeWidth(width: number): number {
  return Math.min(PANEL_MAX_WIDTH, Math.max(PANEL_MIN_WIDTH, width));
}

export function createPanelState() {
  const tabs = sig<PanelTab[]>([]);
  const activeId = sig<string | null>(null);
  return {
    open: sig(false),
    width: sig(PANEL_DEFAULT_WIDTH),
    maximized: sig(false),
    addOpen: sig(false),
    surfaces: sig<UiSurfaceContribution[]>([]),
    tabs,
    activeId,
    activeTab: derive(() => tabs.get().find((tab) => tab.id === activeId.get()) ?? null),
  };
}

export type PanelState = ReturnType<typeof createPanelState>;
