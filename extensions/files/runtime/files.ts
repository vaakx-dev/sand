import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { resolveWorkspacePath } from "@sand/extension-runtime";

import type { FileNode } from "../api.ts";

const OMIT = new Set([".git", "dist", "node_modules", "target"]);

export async function readText(workspace: string, path: string): Promise<string> {
  return readFile(resolveWorkspacePath(workspace, path), "utf8");
}

export async function writeText(workspace: string, path: string, content: string): Promise<void> {
  const target = resolveWorkspacePath(workspace, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
}

export async function tree(
  workspace: string,
  path = ".",
  maxDepth = 5,
  maxEntries = 1_500,
): Promise<FileNode[]> {
  const root = resolveWorkspacePath(workspace, path);
  let count = 0;

  const visit = async (directory: string, depth: number): Promise<FileNode[]> => {
    if (depth > maxDepth || count >= maxEntries) return [];
    const entries = await readdir(directory, { withFileTypes: true });
    const nodes: FileNode[] = [];
    for (const entry of entries.sort((left, right) => {
      if (left.isDirectory() !== right.isDirectory()) return left.isDirectory() ? -1 : 1;
      return left.name.localeCompare(right.name);
    })) {
      if (OMIT.has(entry.name) || count >= maxEntries) continue;
      count += 1;
      const absolute = join(directory, entry.name);
      const relativePath = absolute.slice(workspace.length).replace(/^[/\\]+/, "") || ".";
      if (entry.isDirectory()) {
        nodes.push({
          name: entry.name,
          path: relativePath,
          kind: "directory",
          children: await visit(absolute, depth + 1),
        });
      } else if (entry.isFile()) {
        nodes.push({ name: entry.name, path: relativePath, kind: "file" });
      }
    }
    return nodes;
  };

  return visit(root, 0);
}
