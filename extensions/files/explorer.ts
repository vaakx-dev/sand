import { button, derive, div, dynamicChild, form, icon, input, show, span } from "@vaakx-dev/vrui";
import { ChevronDown, ChevronRight, FileCode2, FileJson2, FileText, Folder, FolderOpen, RefreshCw, Search, X } from "lucide";

import type { WorkspaceFileNode } from "@sand/extension-api";
import type { FilesController } from "./controller.ts";
import type { FilesState } from "./state.ts";

export function explorerView(controller: FilesController, state: FilesState): HTMLElement {
  const visibleTree = derive(() => {
    state.expanded.get();
    return [...filterTree(state.tree.get(), state.query.get())];
  });
  return div(
    { class: "files-explorer", hidden: state.explorerOpen.map((open) => !open) },
    div(
      { class: "files-explorer-header" },
      form(
        { class: "files-search", onSubmit: (event) => { event.preventDefault(); void controller.search(); } },
        icon(Search, 13),
        input({
          class: "files-search-input",
          type: "search",
          placeholder: "Search files",
          bindValue: state.query,
          "aria-label": "Search files",
          onInput: () => state.searchMode.set(false),
        }),
        show(state.query.map(Boolean), () => button(
          { class: "files-small-action", type: "button", "aria-label": "Clear search", onClick: () => controller.clearSearch() },
          icon(X, 11),
        )),
      ),
      button(
        { class: "files-small-action", "aria-label": "Refresh files", "data-tooltip": "Refresh files", onClick: () => void controller.refresh() },
        icon(RefreshCw, 12),
      ),
    ),
    dynamicChild(state.searchMode, (searching) => searching
      ? searchResults(controller, state)
      : dynamicChild(visibleTree, (nodes) => div(
          { class: "files-tree" },
          ...nodes.map((node) => treeNode(controller, state, node, 0, Boolean(state.query.get().trim()))),
        ))
    ),
  );
}

function searchResults(controller: FilesController, state: FilesState): HTMLElement {
  return dynamicChild(state.matches, (matches) => div(
    { class: "files-results" },
    ...(matches.length
      ? matches.map((match) => button(
          { class: "files-result", title: match.path, onClick: () => void controller.open(match.path) },
          span({ class: "files-result-path" }, `${match.path}:${match.line}`),
          span({ class: "files-result-text" }, match.text),
        ))
      : [div({ class: "files-no-results" }, "No matches found")]),
  ));
}

function treeNode(
  controller: FilesController,
  state: FilesState,
  node: WorkspaceFileNode,
  depth: number,
  reveal: boolean,
): HTMLElement {
  if (node.kind === "file") {
    return button(
      {
        class: ["files-tree-row", { active: state.activePath.map((path) => path === node.path) }],
        style: { paddingLeft: `${8 + depth * 14}px` },
        title: node.path,
        onClick: () => void controller.open(node.path),
      },
      icon(fileIcon(node.name), 13),
      span({ class: "files-tree-name" }, node.name),
    );
  }

  const open = reveal || Boolean(state.expanded.get()[node.path]);
  return div(
    button(
      {
        class: "files-tree-row directory",
        style: { paddingLeft: `${8 + depth * 14}px` },
        title: node.path,
        onClick: () => controller.toggleDirectory(node.path),
      },
      icon(open ? ChevronDown : ChevronRight, 12),
      icon(open ? FolderOpen : Folder, 13),
      span({ class: "files-tree-name" }, node.name),
    ),
    ...(open
      ? (node.children ?? []).map((child) => treeNode(controller, state, child, depth + 1, reveal))
      : []),
  );
}

function filterTree(nodes: WorkspaceFileNode[], query: string): WorkspaceFileNode[] {
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
