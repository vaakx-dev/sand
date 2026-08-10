export const commands = {
  tree: "files.tree",
  read: "files.read",
  write: "files.write",
  search: "files.search",
} as const;

export interface FileNode {
  name: string;
  path: string;
  kind: "directory" | "file";
  children?: FileNode[];
}

export interface SearchResult {
  path: string;
  line: number;
  column: number;
  text: string;
}
