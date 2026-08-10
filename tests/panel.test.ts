import { describe, expect, test } from "bun:test";

import type {
  JsonValue,
  RuntimeClient,
  UiSurfaceContribution,
  UiSurfaceRegistry,
} from "@sand/extension-api";
import { RightController } from "../extensions/right-sidebar/controller.ts";
import { createRightState } from "../extensions/right-sidebar/state.ts";

const runtime: RuntimeClient = {
  async call<T = JsonValue>(): Promise<T> {
    return undefined as T;
  },
  subscribe() {
    return () => undefined;
  },
};

const surfaces: UiSurfaceRegistry = {
  register() {
    return () => undefined;
  },
  list() {
    return [];
  },
  subscribe() {
    return () => undefined;
  },
  async open() {},
  onOpen() {
    return () => undefined;
  },
};

function surface(id: string, multiple = false): UiSurfaceContribution {
  return {
    id,
    label: id,
    description: id,
    icon: "file",
    multiple,
    render: () => ({}) as HTMLElement,
  };
}

describe("right sidebar surfaces", () => {
  test("reuses singleton surfaces", () => {
    const state = createRightState();
    const controller = new RightController(runtime, surfaces, state);
    const plan = surface("plan");

    controller.openSurface(plan);
    controller.openSurface(plan);

    expect(state.tabs.get()).toHaveLength(1);
    expect(state.activeTab.get()?.surface.id).toBe("plan");
    expect(state.open.get()).toBe(true);
  });

  test("creates independent instances for multiple surfaces", () => {
    const state = createRightState();
    const controller = new RightController(runtime, surfaces, state);
    const browser = surface("browser", true);

    controller.openSurface(browser);
    controller.openSurface(browser);

    const tabs = state.tabs.get();
    expect(tabs).toHaveLength(2);
    expect(tabs[0]?.id).not.toBe(tabs[1]?.id);
  });

  test("selects an adjacent tab after closing the active one", () => {
    const state = createRightState();
    const controller = new RightController(runtime, surfaces, state);
    controller.openSurface(surface("files"));
    controller.openSurface(surface("plan"));
    const active = state.activeId.get();
    if (!active) throw new Error("missing active surface");

    controller.closeTab(active);

    expect(state.tabs.get()).toHaveLength(1);
    expect(state.activeTab.get()?.surface.id).toBe("files");
  });
});
