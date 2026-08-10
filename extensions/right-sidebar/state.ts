import { derive, sig } from "@vaakx-dev/vrui";

import type { UiSurfaceContribution } from "@sand/extension-api";
import type { PanelTab } from "./models.ts";

export function createRightState() {
  const tabs = sig<PanelTab[]>([]);
  const activeId = sig<string | null>(null);
  return {
    open: sig(false),
    width: sig(430),
    maximized: sig(false),
    addOpen: sig(false),
    surfaces: sig<UiSurfaceContribution[]>([]),
    tabs,
    activeId,
    activeTab: derive(() => tabs.get().find((tab) => tab.id === activeId.get()) ?? null),
    gitRepository: sig(false),
    gitStatus: sig(""),
    gitDiff: sig(""),
    error: sig(""),
  };
}

export type RightState = ReturnType<typeof createRightState>;
