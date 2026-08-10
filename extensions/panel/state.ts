import { derive, sig } from "@vaakx-dev/vrui";

import type { UiSurfaceContribution } from "@sand/extension-api";
import type { PanelTab } from "./models.ts";

const MIN_WIDTH = 300;
const MAX_WIDTH = 900;

export function normalizeWidth(width: number): number {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width));
}

export function createPanelState() {
  const tabs = sig<PanelTab[]>([]);
  const activeId = sig<string | null>(null);
  return {
    open: sig(false),
    width: sig(normalizeWidth(430)),
    maximized: sig(false),
    addOpen: sig(false),
    surfaces: sig<UiSurfaceContribution[]>([]),
    tabs,
    activeId,
    activeTab: derive(() => tabs.get().find((tab) => tab.id === activeId.get()) ?? null),
  };
}

export type PanelState = ReturnType<typeof createPanelState>;
