import { describe, expect, test } from "bun:test";

import { ProjectsController } from "../extensions/workbench/controller/projects.ts";
import { createState } from "../extensions/workbench/state.ts";

describe("project picker intent", () => {
  test("creates a new draft when the current project is selected", async () => {
    const state = createState();
    state.root.set("D:\\app\\codeit");
    state.sessionId.set("existing-thread");
    state.projectQuery.set("old query");
    let drafts = 0;
    const controller = new ProjectsController(
      { state } as never,
      () => {
        drafts += 1;
        state.sessionId.set(null);
      },
    );

    controller.openPicker("newThread");
    expect(state.projectPickerOpen.get()).toBe(true);
    expect(state.projectQuery.get()).toBe("");
    expect(state.projectPickerIntent.get()).toBe("newThread");

    await controller.select("d:\\APP\\codeit");
    expect(drafts).toBe(1);
    expect(state.sessionId.get()).toBeNull();
    expect(state.projectPickerOpen.get()).toBe(false);
  });

  test("does not clear the thread for ordinary project selection", async () => {
    const state = createState();
    state.root.set("D:\\app\\codeit");
    let drafts = 0;
    const controller = new ProjectsController({ state } as never, () => drafts += 1);

    controller.openPicker("switch");
    await controller.select("D:\\app\\codeit");

    expect(drafts).toBe(0);
  });
});
