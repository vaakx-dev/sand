import { button, div, dynamicChild, form, icon, input, list, preventThen, span } from "@vaakx-dev/vrui";
import { File, Folder, RefreshCw, Search } from "lucide";

import type { ExtensionDescription } from "@sand/extension-api";

import type { WorkbenchController } from "../../controller.ts";
import type { FileTreeNode } from "../../models.ts";
import type { WorkbenchState } from "../../state.ts";
import { panelHeader } from "./shared.ts";

export function explorerView(
  controller: WorkbenchController,
  state: WorkbenchState,
): HTMLElement {
  return div(
    { class: "sidebar-view" },
    panelHeader(
      "Files",
      button(
        {
          class: "sidebar-menu-icon",
          "aria-label": "Refresh files",
          "data-tooltip": "Refresh files",
          onClick: () => void controller.workspace.refreshTree(),
        },
        icon(RefreshCw, 14),
      ),
    ),
    dynamicChild(state.tree, (nodes) => div(
      { class: "panel-scroll file-tree" },
      ...nodes.map((node) => treeNode(controller, node, 0)),
    )),
  );
}

export function searchView(
  controller: WorkbenchController,
  state: WorkbenchState,
): HTMLElement {
  return div(
    { class: "sidebar-view" },
    panelHeader("Search"),
    form(
      { class: "search-box", onSubmit: preventThen(() => void controller.workspace.search()) },
      input({ class: "text-input", placeholder: "Search files", bindValue: state.searchQuery }),
      button({ class: "sidebar-menu-icon", type: "submit", "aria-label": "Search", "data-tooltip": "Search" }, icon(Search, 14)),
    ),
    list(
      state.searchResults,
      (result) => `${result.path}:${result.line}:${result.column}`,
      (result) => button(
        {
          class: "result-row",
          onClick: () => void controller.workspace.openFile(result.get().path),
        },
        div({ class: "result-path" }, result.map((value) => `${value.path}:${value.line}`)),
        div({ class: "result-text" }, result.prop("text")),
      ),
      div({ class: "panel-scroll" }),
    ),
  );
}

export function extensionsView(
  controller: WorkbenchController,
  state: WorkbenchState,
): HTMLElement {
  return div(
    { class: "sidebar-view" },
    panelHeader(
      "Extensions",
      button(
        {
          class: "sidebar-menu-icon",
          "aria-label": "Reload extensions",
          "data-tooltip": "Reload extensions",
          onClick: () => void controller.preferences.reloadExtensions(),
        },
        icon(RefreshCw, 14),
      ),
    ),
    list(
      state.extensions,
      (extension) => extension.id,
      (extension) => extensionRow(extension.get()),
      div({ class: "panel-scroll" }),
    ),
  );
}

function treeNode(
  controller: WorkbenchController,
  node: FileTreeNode,
  depth: number,
): HTMLElement {
  const row = node.kind === "file"
    ? button(
        {
          class: "file-row",
          style: { paddingLeft: `${10 + depth * 13}px` },
          title: node.path,
          onClick: () => void controller.workspace.openFile(node.path),
        },
        icon(File, 13),
        span({ class: "file-name" }, node.name),
      )
    : div(
        {
          class: ["file-row", "directory"],
          style: { paddingLeft: `${10 + depth * 13}px` },
          title: node.path,
        },
        icon(Folder, 13),
        span({ class: "file-name" }, node.name),
      );
  return div(row, ...(node.children || []).map((child) => treeNode(controller, child, depth + 1)));
}

function extensionRow(extension: ExtensionDescription): HTMLElement {
  return div(
    { class: "extension-row" },
    div(
      { class: "extension-name" },
      span(extension.name),
      span({ class: "badge" }, extension.source),
    ),
    div({ class: "extension-meta" }, `${extension.id} · ${extension.version}`),
    div(
      { class: "extension-contributions" },
      extension.contributions.length ? extension.contributions.join(" · ") : "UI extension",
    ),
  );
}
