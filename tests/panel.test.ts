import { describe, expect, test } from "bun:test";

import {
  closePanelTab,
  DEFAULT_BROWSER_URL,
  openPanel,
  requestBrowserNavigation,
  updateBrowserLocation,
} from "../extensions/workbench/panel.ts";
import { createState } from "../extensions/workbench/state.ts";

describe("right panel tabs", () => {
  test("creates independent browser instances and resets closed browsers", () => {
    const state = createState();
    openPanel(state, "browser");
    openPanel(state, "browser");

    const browsers = state.rightTabs.get().filter((tab) => tab.view === "browser");
    expect(browsers).toHaveLength(2);
    expect(browsers[0]?.id).not.toBe(browsers[1]?.id);

    const first = browsers[0];
    if (!first || first.view !== "browser") throw new Error("missing browser tab");
    first.input.set("google.com");
    requestBrowserNavigation(first);
    expect(first.url.get()).toBe("https://google.com");

    closePanelTab(state, first.id);
    openPanel(state, "browser");
    const latest = state.rightTabs.get().at(-1);
    if (!latest || latest.view !== "browser") throw new Error("missing replacement browser tab");
    expect(latest.url.get()).toBe(DEFAULT_BROWSER_URL);
    expect(latest.input.get()).toBe(DEFAULT_BROWSER_URL);
  });

  test("updates the address without issuing a duplicate navigation", () => {
    const state = createState();
    openPanel(state, "browser");
    const tab = state.rightActiveTab.get();
    if (!tab || tab.view !== "browser") throw new Error("missing browser tab");
    const request = tab.request.get();

    updateBrowserLocation(tab, "https://www.iana.org/domains");

    expect(tab.input.get()).toBe("https://www.iana.org/domains");
    expect(tab.url.get()).toBe("https://www.iana.org/domains");
    expect(tab.request.get()).toEqual(request);
  });

  test("reuses singleton surfaces such as Plan", () => {
    const state = createState();
    openPanel(state, "tasks");
    openPanel(state, "tasks");

    expect(state.rightTabs.get().filter((tab) => tab.view === "tasks")).toHaveLength(1);
    expect(state.rightActiveTab.get()?.view).toBe("tasks");
  });
});
