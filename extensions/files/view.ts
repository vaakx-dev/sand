import { derive, div, icon, show, span } from "@vaakx-dev/vrui";
import { Files, Save } from "lucide";

import type { SandUi } from "sand:api/ui";
import { styled } from "sand:api/ui";
import type { FilesController } from "./controller.ts";
import type { FilesState } from "./state.ts";
import { editorView } from "./views/editor.ts";
import { explorerView } from "./views/explorer.ts";

const Surface = styled(div, {
  width: "100%",
  minWidth: 0,
  minHeight: 0,
  flex: 1,
  display: "flex",
  flexDirection: "column",
  background: "var(--background)",
});

const Toolbar = styled(div, {
  height: "var(--header-height)",
  flex: "0 0 var(--header-height)",
  display: "flex",
  alignItems: "center",
  gap: "var(--space-small)",
  padding: "0 var(--space-medium)",
  borderBottom: "1px solid var(--border)",
});

const Breadcrumb = styled(div, {
  minWidth: 0,
  flex: 1,
  display: "flex",
  alignItems: "center",
  gap: "var(--space-medium)",
  overflow: "hidden",
  color: "var(--muted)",
  fontSize: "var(--font-caption)",
});

const RootName = styled(span, { flex: "0 0 auto", color: "var(--muted)" });
const Separator = styled(span, { color: "var(--muted)" });
const Path = styled(span, {
  minWidth: 0,
  overflow: "hidden",
  color: "var(--text)",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

const ErrorNotice = styled(div, {
  padding: "var(--space-medium) var(--space-large)",
  borderBottom: "1px solid var(--border)",
  color: "var(--danger)",
  fontSize: "var(--font-caption)",
});

const Workspace = styled(div, {
  minWidth: 0,
  minHeight: 0,
  flex: 1,
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(240px, 320px)",
  "&[data-explorer=false]": { gridTemplateColumns: "minmax(0, 1fr)" },
  "@container (max-width: 720px)": {
    "&[data-explorer=true]": {
      gridTemplateColumns: "minmax(0, 1fr)",
      gridTemplateRows: "minmax(220px, 1fr) minmax(180px, 42%)",
    },
  },
});

export function filesView(
  controller: FilesController,
  state: FilesState,
  ui: SandUi,
): HTMLElement {
  const dirty = derive(() => {
    const file = state.activeFile.get();
    return Boolean(file && file.content !== file.savedContent);
  });
  return Surface(
    {},
    Toolbar(
      {},
      Breadcrumb(
        {},
        RootName({}, state.root.map(lastSegment)),
        show(state.activePath.map(Boolean), () => span(
          Separator({}, "/"),
          Path({}, state.activePath),
        )),
      ),
      ui.iconButton({
        label: "Save file",
        disabled: dirty.map((value) => !value),
        renderIcon: (size) => icon(Save, size),
        onClick: () => void controller.save(),
      }),
      ui.iconButton({
        label: "Toggle Explorer",
        selected: state.explorerOpen,
        renderIcon: (size) => icon(Files, size),
        onClick: state.explorerOpen.toggle(),
      }),
    ),
    show(state.error.map(Boolean), () => ErrorNotice({}, state.error)),
    Workspace(
      { "data-explorer": state.explorerOpen },
      editorView(controller, state, ui),
      explorerView(controller, state, ui),
    ),
  );
}

function lastSegment(path: string): string {
  return path.split(/[\\/]/u).filter(Boolean).at(-1) || path;
}
