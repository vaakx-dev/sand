import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

import {
  objectValue,
  requiredString,
  type HostExtension,
  type JsonValue,
} from "@sand/extension-api";
import { spawnText } from "@sand/extension-runtime";

import { commands, type Project } from "./api.ts";

interface StoredProject extends Project {
  [key: string]: JsonValue;
}

const extension: HostExtension = {
  async activate(context) {
    const registry = join(context.config, "projects.json");
    await remember(registry, context.workspace);

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
      const result = await spawnText(["git", "clone", "--", source, target], parent);
      if (result.exitCode !== 0) throw new Error(result.stderr.trim() || "git clone failed");
      await remember(registry, target);
      return { project: description(target), projects: await load(registry) };
    });
  },
};

async function load(path: string): Promise<StoredProject[]> {
  try {
    const projects = JSON.parse(await readFile(path, "utf8")) as StoredProject[];
    return projects
      .filter((item) => item?.path && item?.name)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function remember(registry: string, workspace: string): Promise<void> {
  await requireDirectory(workspace);
  const current = description(workspace);
  const key = normalized(workspace);
  const projects = (await load(registry)).filter((item) => normalized(item.path) !== key);
  await mkdir(dirname(registry), { recursive: true });
  await writeFile(
    registry,
    `${JSON.stringify([current, ...projects].slice(0, 30), null, 2)}\n`,
    "utf8",
  );
}

function description(path: string): StoredProject {
  return { name: basename(path) || path, path, updatedAt: new Date().toISOString() };
}

async function requireDirectory(path: string): Promise<void> {
  const metadata = await stat(path);
  if (!metadata.isDirectory()) throw new Error(`not a directory: ${path}`);
}

async function requireMissing(path: string): Promise<void> {
  try {
    await stat(path);
    throw new Error(`destination already exists: ${path}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
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
  const result = await spawnText(command, process.cwd());
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

function normalized(path: string): string {
  return process.platform === "win32" ? path.toLowerCase() : path;
}

export default extension;
