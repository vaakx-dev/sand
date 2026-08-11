import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export async function readJson<Value>(path: string): Promise<Value | undefined> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as Value;
  } catch (error) {
    if (missing(error)) return undefined;
    throw error;
  }
}

export async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${randomUUID()}.next`;
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true });
  }
}

export function missing(error: unknown): boolean {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && error.code === "ENOENT";
}
