import { button, derive, div, dynamicChild, icon, list, show, span, stopThen, textarea } from "@vaakx-dev/vrui";
import { X } from "lucide";

import type { WorkbenchController } from "../../controller.ts";
import type { WorkbenchState } from "../../state.ts";

export function filesView(
  controller: WorkbenchController,
  state: WorkbenchState,
): HTMLElement {
  return div(
    { class: "editor" },
    list(
      state.tabs,
      (tab) => tab.path,
      (tab) => {
        const active = derive(() => state.activePath.get() === tab.get().path);
        const dirty = derive(() => tab.get().content !== tab.get().savedContent);
        return div(
          {
            class: ["tab", { active }],
            role: "tab",
            tabIndex: 0,
            title: tab.prop("path"),
            onClick: () => state.activePath.set(tab.get().path),
            onKeyDown: (event) => {
              if (event.key === "Enter" || event.key === " ") state.activePath.set(tab.get().path);
            },
          },
          show(dirty, () => div({ class: "dirty-dot" })),
          span({ class: "tab-name" }, tab.prop("name")),
          button(
            {
              class: "tab-close",
              "aria-label": "Close file",
              onClick: stopThen(() => controller.workspace.closeTab(tab.get().path)),
            },
            icon(X, 12),
          ),
        );
      },
      div({ class: "tabs" }),
    ),
    dynamicChild(state.activePath, (path) => {
      if (!path) {
        return div(
          { class: "editor-content" },
          div(
            { class: "welcome" },
            div({ class: "welcome-mark" }, "s"),
            div("Open a file or ask the agent to begin"),
            div({ class: "welcome-detail" }, "Open Files to browse the project"),
          ),
        );
      }
      const content = derive(() => state.tabs.get().find((tab) => tab.path === path)?.content ?? "");
      return div(
        { class: "editor-content" },
        textarea({
          class: ["editor-textarea", { wrapped: state.wordWrap }],
          value: content,
          spellcheck: false,
          onInput: (event) => controller.workspace.updateActive((event.target as HTMLTextAreaElement).value),
          onKeyDown: (event) => editorKeyDown(event, controller),
        }),
      );
    }),
  );
}

function editorKeyDown(event: KeyboardEvent, controller: WorkbenchController): void {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    void controller.workspace.saveActive();
    return;
  }
  if (event.key !== "Tab") return;
  event.preventDefault();
  const target = event.target as HTMLTextAreaElement;
  const start = target.selectionStart;
  const end = target.selectionEnd;
  target.setRangeText("  ", start, end, "end");
  controller.workspace.updateActive(target.value);
}
