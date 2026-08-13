import { realpath, stat } from "node:fs/promises";
import { basename, join } from "node:path";

import {
  objectValue,
  requiredString,
  type AppExtension,
  type JsonValue,
} from "@sand/extension-api";
import { missing, readJson, spawnText, writeJson } from "@sand/extension-runtime";

import { commands, type Project } from "./api.ts";
import { cleanPath, pathKey } from "./path.ts";

interface StoredProject extends Project {
  [key: string]: JsonValue;
}

const extension: AppExtension = {
  async activate(context) {
    const registry = join(context.home, "projects.json");
    await remember(registry, context.workspace.path);

    context.commands.register(commands.list, () => load(registry));
    context.commands.register(commands.pick, pickDirectory);
    context.commands.register(commands.add, async (params) => {
      const path = requiredString(objectValue(params), "path");
      await requireDirectory(path);
      await remember(registry, path);
      return load(registry);
    });
    context.commands.register(commands.clone, async (params) => {
      const value = objectValue(params);
      const source = cloneUrl(requiredString(value, "url"));
      const parent = requiredString(value, "parent");
      await requireDirectory(parent);
      const target = join(parent, repositoryName(source));
      await requireMissing(target);
      const result = await spawnText(
        ["git", "clone", "--", source, target],
        { cwd: parent },
      );
      if (result.exitCode !== 0) throw new Error(result.stderr.trim() || "git clone failed");
      await remember(registry, target);
      return { project: description(target), projects: await load(registry) };
    });
  },
};

async function load(path: string): Promise<StoredProject[]> {
  const projects = await readJson<StoredProject[]>(path) ?? [];
  const normalized = await Promise.all(projects
    .filter((item) => item?.path && item?.name)
    .map(async (item) => ({ ...item, path: await existingPath(item.path) })));
  const seen = new Set<string>();
  return normalized
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .filter((project) => {
      const key = pathKey(project.path);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

async function remember(registry: string, workspace: string): Promise<void> {
  const current = description(await requireDirectory(workspace));
  const key = pathKey(current.path);
  const projects = (await load(registry)).filter((item) => pathKey(item.path) !== key);
  await writeJson(registry, [current, ...projects].slice(0, 30));
}

function description(path: string): StoredProject {
  const clean = cleanPath(path);
  return { name: basename(clean) || clean, path: clean, updatedAt: new Date().toISOString() };
}

async function requireDirectory(path: string): Promise<string> {
  const clean = cleanPath(path);
  const metadata = await stat(clean);
  if (!metadata.isDirectory()) throw new Error(`not a directory: ${clean}`);
  return cleanPath(await realpath(clean));
}

async function existingPath(path: string): Promise<string> {
  try {
    return cleanPath(await realpath(cleanPath(path)));
  } catch {
    return cleanPath(path);
  }
}

async function requireMissing(path: string): Promise<void> {
  try {
    await stat(path);
    throw new Error(`destination already exists: ${path}`);
  } catch (error) {
    if (!missing(error)) throw error;
  }
}

async function pickDirectory(): Promise<string> {
  const command = process.platform === "win32"
    ? [
        "powershell.exe",
        "-NoProfile",
        "-WindowStyle",
        "Hidden",
        "-STA",
        "-Command",
        "Add-Type -AssemblyName System.Windows.Forms; $dialog = New-Object System.Windows.Forms.FolderBrowserDialog; $dialog.Description = 'Choose a Sand project folder'; if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Out.Write($dialog.SelectedPath) }",
      ]
    : process.platform === "darwin"
      ? ["osascript", "-e", "POSIX path of (choose folder with prompt \"Choose a Sand project folder\")"]
      : ["zenity", "--file-selection", "--directory", "--title=Choose a Sand project folder"];
  const result = await spawnText(command, { cwd: process.cwd() });
  if (result.exitCode !== 0 && result.exitCode !== 1) {
    throw new Error(result.stderr.trim() || "folder picker failed");
  }
  return result.stdout.trim();
}

function cloneUrl(value: string): string {
  const shorthand = value.match(/^([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
  return shorthand ? `https://github.com/${shorthand[1]}/${shorthand[2]}.git` : value;
}

function repositoryName(url: string): string {
  const name = url.replace(/[\\/]+$/, "").split(/[\\/:]/).at(-1)?.replace(/\.git$/i, "").trim();
  if (!name || name === "." || name === "..") throw new Error("could not determine repository name");
  return name;
}

export default extension;
