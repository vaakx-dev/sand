import { isAbsolute, resolve } from "node:path";

export { registerThreadTools, type ThreadTool } from "./threadTools.ts";
export { ExtensionState } from "./state.ts";
export { missing, readJson, writeJson } from "./json.ts";
export {
  spawnText,
  type ProcessOptions,
  type ProcessResult,
} from "./process.ts";

export function resolveWorkspacePath(workspace: string, path = "."): string {
  return isAbsolute(path) ? resolve(path) : resolve(workspace, path);
}

export function shellArguments(command: string, platform = process.platform): string[] {
  return platform === "win32"
    ? ["powershell", "-NoProfile", "-Command", command]
    : ["bash", "-lc", command];
}
