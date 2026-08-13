import { derive, div, dynamicChild, icon } from "@vaakx-dev/vrui";
import { FileCode2, FileJson2, FileText, Folder, FolderOpen, RefreshCw } from "lucide";

import type { SandUi } from "sand:api/ui";
import { styled } from "sand:api/ui";
import type { FileNode } from "../api.ts";
import type { FilesController } from "../controller.ts";
import type { FilesState } from "../state.ts";

const Explorer = styled(div, {
  minWidth: 0,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  borderLeft: "1px solid var(--border)",
  background: "var(--panel)",
  "@container (max-width: 720px)": { borderTop: "1px solid var(--border)", borderLeft: 0 },
});

const Header = styled(div, {
  height: "var(--header-height)",
  flex: "0 0 var(--header-height)",
  display: "flex",
  alignItems: "center",
  gap: "var(--space-small)",
  padding: "var(--space-small) var(--space-medium)",
  borderBottom: "1px solid var(--border)",
});

const Items = styled(div, {
  minHeight: 0,
  flex: 1,
  overflow: "auto",
  padding: "var(--space-small) 0 var(--space-large)",
});

const Empty = styled(div, {
  padding: "var(--space-page) var(--space-large)",
  color: "var(--muted)",
  textAlign: "center",
  fontSize: "var(--font-caption)",
});

export function explorerView(
  controller: FilesController,
  state: FilesState,
  ui: SandUi,
): HTMLElement {
  const visibleTree = derive(() => {
    state.expanded.get();
    return filterTree(state.tree.get(), state.query.get());
  });
  return Explorer(
    { hidden: state.explorerOpen.map((open) => !open) },
    Header(
      {},
      ui.searchField({
        value: state.query,
        label: "Search files",
        placeholder: "Search files",
        onInput: () => state.searchMode.set(false),
        onSubmit: () => controller.search(),
        onClear: () => controller.clearSearch(),
      }),
      ui.iconButton({
        label: "Refresh files",
        variant: "compact",
        renderIcon: (size) => icon(RefreshCw, size),
        onClick: () => void controller.refresh(),
      }),
    ),
    dynamicChild(state.searchMode, (searching) => searching
      ? searchResults(controller, state, ui)
      : dynamicChild(visibleTree, (nodes) => Items(
          {},
          ...nodes.map((node) => treeNode(controller, state, ui, node, 0, Boolean(state.query.get().trim()))),
        ))),
  );
}

function searchResults(
  controller: FilesController,
  state: FilesState,
  ui: SandUi,
): HTMLElement {
  return dynamicChild(state.matches, (matches) => Items(
    {},
    ...(matches.length
      ? matches.map((match) => ui.listItem({
          label: `${match.path}:${match.line}`,
          description: match.text,
          onClick: () => void controller.open(match.path),
        }))
      : [Empty({}, "No matches found")]),
  ));
}

function treeNode(
  controller: FilesController,
  state: FilesState,
  ui: SandUi,
  node: FileNode,
  depth: number,
  reveal: boolean,
): HTMLElement {
  if (node.kind === "file") {
    return ui.treeItem({
      label: node.name,
      depth,
      selected: state.activePath.map((path) => path === node.path),
      renderIcon: (size) => icon(fileIcon(node.name), size),
      onClick: () => void controller.open(node.path),
    });
  }
  const open = reveal || Boolean(state.expanded.get()[node.path]);
  return div(
    {},
    ui.treeItem({
      label: node.name,
      depth,
      expanded: open,
      renderIcon: (size) => icon(open ? FolderOpen : Folder, size),
      onClick: () => controller.toggleDirectory(node.path),
    }),
    ...(open
      ? (node.children ?? []).map((child) => treeNode(controller, state, ui, child, depth + 1, reveal))
      : []),
  );
}

function filterTree(nodes: FileNode[], query: string): FileNode[] {
  const value = query.trim().toLocaleLowerCase();
  if (!value) return nodes;
  return nodes.flatMap((node) => {
    if (node.kind === "file") return node.name.toLocaleLowerCase().includes(value) ? [node] : [];
    const children = filterTree(node.children ?? [], value);
    return node.name.toLocaleLowerCase().includes(value) || children.length
      ? [{ ...node, children }]
      : [];
  });
}

function fileIcon(name: string): Parameters<typeof icon>[0] {
  const extension = name.split(".").at(-1)?.toLocaleLowerCase();
  if (extension === "json") return FileJson2;
  if (["ts", "tsx", "js", "jsx", "rs", "html", "css"].includes(extension ?? "")) return FileCode2;
  return FileText;
}
