import { describe, expect, test } from "bun:test";

import {
  resolveWorkspacePath,
  shellArguments,
} from "../packages/extension-runtime/src/index.ts";

describe("extension runtime support", () => {
  test("resolves workspace-relative and absolute paths", () => {
    const workspace = process.platform === "win32" ? "C:\\work" : "/work";
    const absolute = process.platform === "win32" ? "D:\\file.txt" : "/tmp/file.txt";

    expect(resolveWorkspacePath(workspace, "src/file.txt")).toContain("src");
    expect(resolveWorkspacePath(workspace, absolute)).toBe(absolute);
  });

  test("builds platform shell arguments", () => {
    expect(shellArguments("echo sand", "win32")).toEqual([
      "powershell",
      "-NoProfile",
      "-Command",
      "echo sand",
    ]);
    expect(shellArguments("echo sand", "linux")).toEqual(["bash", "-lc", "echo sand"]);
  });
});
