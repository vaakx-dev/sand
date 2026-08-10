import { derive, sig } from "@vaakx-dev/vrui";

import type { FileNode, SearchResult } from "./api.ts";
import type { OpenFile } from "./models.ts";

export function createFilesState() {
  const tabs = sig<OpenFile[]>([]);
  const activePath = sig<string | null>(null);
  return {
    root: sig(""),
    tree: sig<FileNode[]>([]),
    expanded: sig<Record<string, boolean>>({}),
    query: sig(""),
    matches: sig<SearchResult[]>([]),
    searchMode: sig(false),
    explorerOpen: sig(true),
    tabs,
    activePath,
    activeFile: derive(() => tabs.get().find((file) => file.path === activePath.get()) ?? null),
    error: sig(""),
  };
}

export type FilesState = ReturnType<typeof createFilesState>;
