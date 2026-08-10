import { button, derive, div, icon, show, span } from "@vaakx-dev/vrui";
import { Files, Save } from "lucide";

import type { FilesController } from "./controller.ts";
import { editorView } from "./editor.ts";
import { explorerView } from "./explorer.ts";
import type { FilesState } from "./state.ts";

export function filesView(controller: FilesController, state: FilesState): HTMLElement {
  const dirty = derive(() => {
    const file = state.activeFile.get();
    return Boolean(file && file.content !== file.savedContent);
  });
  return div(
    { class: "files-surface" },
    div(
      { class: "files-toolbar" },
      div(
        { class: "files-breadcrumb" },
        span({ class: "files-root" }, state.root.map(lastSegment)),
        show(state.activePath.map(Boolean), () => span(
          { class: "files-active-path" },
          span({ class: "files-separator" }, "/"),
          span({ class: "files-path" }, state.activePath),
        )),
      ),
      button(
        { class: "files-toolbar-action", disabled: dirty.map((value) => !value), "aria-label": "Save file", "data-tooltip": "Save file (Ctrl+S)", onClick: () => void controller.save() },
        icon(Save, 13),
      ),
      button(
        { class: ["files-toolbar-action", { active: state.explorerOpen }], "aria-label": "Toggle Explorer", "aria-pressed": state.explorerOpen, "data-tooltip": "Toggle Explorer", onClick: state.explorerOpen.toggle() },
        icon(Files, 13),
      ),
    ),
    show(state.error.map(Boolean), () => div({ class: "files-error" }, state.error)),
    div(
      { class: ["files-workspace", { "explorer-hidden": state.explorerOpen.map((open) => !open) }] },
      editorView(controller, state),
      explorerView(controller, state),
    ),
  );
}

function lastSegment(path: string): string {
  return path.split(/[\\/]/u).filter(Boolean).at(-1) || path;
}
