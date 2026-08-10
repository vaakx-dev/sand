import { button, derive, div, dynamicChild, icon, list, show, span, stopThen } from "@vaakx-dev/vrui";
import { X } from "lucide";

import type { FilesController } from "./controller.ts";
import { sourceEditor } from "./source.ts";
import type { FilesState } from "./state.ts";

export function editorView(controller: FilesController, state: FilesState): HTMLElement {
  return div(
    { class: "files-editor" },
    fileTabs(controller, state),
    dynamicChild(state.activePath, (path) => path
      ? sourceEditor(controller, state, path)
      : emptyEditor()
    ),
  );
}

function fileTabs(controller: FilesController, state: FilesState): HTMLElement {
  return list(
    state.tabs,
    (file) => file.path,
    (file) => {
      const active = derive(() => state.activePath.get() === file.get().path);
      const dirty = derive(() => file.get().content !== file.get().savedContent);
      return div(
        {
          class: ["file-tab", { active }],
          role: "tab",
          tabIndex: 0,
          "aria-selected": active,
          title: file.prop("path"),
          onClick: () => state.activePath.set(file.get().path),
          onKeyDown: (event) => {
            if (event.key === "Enter" || event.key === " ") state.activePath.set(file.get().path);
          },
        },
        show(dirty, () => span({ class: "file-dirty" })),
        span({ class: "file-tab-name" }, file.prop("name")),
        button(
          {
            class: "file-tab-close",
            "aria-label": "Close file",
            onClick: stopThen(() => controller.close(file.get().path)),
          },
          icon(X, 11),
        ),
      );
    },
    div({ class: "file-tabs", role: "tablist" }),
  );
}

function emptyEditor(): HTMLElement {
  return div(
    { class: "files-empty" },
    span({ class: "files-empty-mark" }, "s"),
    span("Choose a file from Explorer"),
  );
}
