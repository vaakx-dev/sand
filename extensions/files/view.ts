import { derive, div, icon, show, span } from "@vaakx-dev/vrui";
import { Files, Save } from "lucide";

import type { UiControls } from "@sand/extension-api";

import type { FilesController } from "./controller.ts";
import { editorView } from "./views/editor.ts";
import { explorerView } from "./views/explorer.ts";
import type { FilesState } from "./state.ts";

export function filesView(
  controller: FilesController,
  state: FilesState,
  controls: UiControls,
): HTMLElement {
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
      controls.iconButton({
        label: "Save file",
        tooltip: "Save file (Ctrl+S)",
        className: "files-toolbar-action",
        disabled: dirty.map((value) => !value),
        renderIcon: (size) => icon(Save, size),
        onClick: () => void controller.save(),
      }),
      controls.iconButton({
        label: "Toggle Explorer",
        className: "files-toolbar-action",
        selected: state.explorerOpen,
        renderIcon: (size) => icon(Files, size),
        onClick: state.explorerOpen.toggle(),
      }),
    ),
    show(state.error.map(Boolean), () => div({ class: "files-error" }, state.error)),
    div(
      { class: ["files-workspace", { "explorer-hidden": state.explorerOpen.map((open) => !open) }] },
      editorView(controller, state, controls),
      explorerView(controller, state, controls),
    ),
  );
}

function lastSegment(path: string): string {
  return path.split(/[\\/]/u).filter(Boolean).at(-1) || path;
}
