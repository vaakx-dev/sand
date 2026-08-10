import { sig } from "@vaakx-dev/vrui";

import type { BrowserTab, RightTab, RightView } from "./models.ts";
import type { WorkbenchState } from "./state.ts";

export const DEFAULT_BROWSER_URL = "https://example.com";

export function openPanel(state: WorkbenchState, view: RightView): void {
  state.rightAddOpen.set(false);
  const existing = view === "browser"
    ? undefined
    : state.rightTabs.get().find((tab) => tab.view === view);
  const tab = existing ?? createTab(view);
  if (!existing) state.rightTabs.update((tabs) => [...tabs, tab]);
  state.rightActiveId.set(tab.id);
  state.rightOpen.set(true);
}

export function togglePanel(state: WorkbenchState): void {
  if (state.rightOpen.get()) {
    hidePanel(state);
    return;
  }
  state.rightOpen.set(true);
}

export function hidePanel(state: WorkbenchState): void {
  state.rightAddOpen.set(false);
  state.rightMaximized.set(false);
  state.rightOpen.set(false);
}

export function togglePanelMaximized(state: WorkbenchState): void {
  state.rightMaximized.toggle()();
}

export function restorePanel(state: WorkbenchState): void {
  state.rightMaximized.set(false);
}

export function closePanelTab(state: WorkbenchState, id: string): void {
  const tabs = state.rightTabs.get();
  const index = tabs.findIndex((tab) => tab.id === id);
  if (index < 0) return;
  const remaining = tabs.filter((tab) => tab.id !== id);
  state.rightTabs.set(remaining);
  if (state.rightActiveId.get() === id) {
    state.rightActiveId.set(remaining[Math.min(index, remaining.length - 1)]?.id ?? null);
  }
}

export function requestBrowserNavigation(tab: BrowserTab): void {
  const url = normalizeBrowserUrl(tab.input.get());
  if (!url) return;
  tab.input.set(url);
  tab.url.set(url);
  tab.request.update((request) => ({ id: request.id + 1, url }));
}

export function updateBrowserLocation(tab: BrowserTab, url: string): void {
  tab.url.set(url);
  tab.input.set(url);
}

function createTab(view: RightView): RightTab {
  if (view !== "browser") return { id: view, view };
  return createBrowserTab();
}

function createBrowserTab(): BrowserTab {
  return {
    id: `browser-${crypto.randomUUID()}`,
    view: "browser",
    input: sig(DEFAULT_BROWSER_URL),
    url: sig(DEFAULT_BROWSER_URL),
    request: sig({ id: 0, url: DEFAULT_BROWSER_URL }),
  };
}

function normalizeBrowserUrl(value: string): string {
  const url = value.trim();
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}
