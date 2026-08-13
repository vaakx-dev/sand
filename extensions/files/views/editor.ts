import { div, dynamicChild } from "@vaakx-dev/vrui";

import type { SandUi } from "sand:api/ui";
import { styled } from "sand:api/ui";
import type { FilesController } from "../controller.ts";
import type { FilesState } from "../state.ts";
import { sourceEditor } from "./source.ts";

const Editor = styled(div, {
  minWidth: 0,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
});

export function editorView(
  controller: FilesController,
  state: FilesState,
  ui: SandUi,
): HTMLElement {
  return Editor(
    {},
    ui.tabs({
      variant: "document",
      items: state.tabs,
      active: state.activePath,
      getId: (file) => file.path,
      getLabel: (file) => file.name,
      isDirty: (file) => file.content !== file.savedContent,
      onSelect: (file) => state.activePath.set(file.path),
      onClose: (file) => controller.close(file.path),
    }),
    dynamicChild(state.activePath, (path) => path
      ? sourceEditor(controller, state, path)
      : ui.emptyState({ title: "Choose a file from Explorer" })),
  );
}
