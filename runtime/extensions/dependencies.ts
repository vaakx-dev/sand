import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { errorMessage } from "@sand/extension-api";

import type { Loaded } from "./discovery.ts";

interface PackageManifest {
  dependencies?: unknown;
}

interface Receipt {
  root: string;
  dependencies: string;
}

export class Dependencies {
  private readonly pending = new Map<string, Promise<void>>();

  constructor(
    private readonly cache: string,
    private readonly coreModules: Set<string>,
  ) {}

  prepare(extension: Loaded): Promise<void> {
    const existing = this.pending.get(extension.root);
    if (existing) return existing;

    const promise = this.prepareOnce(extension).finally(() => {
      this.pending.delete(extension.root);
    });
    this.pending.set(extension.root, promise);
    return promise;
  }

  private async prepareOnce(extension: Loaded): Promise<void> {
    const dependencies = await readDependencies(extension.root);
    const names = Object.keys(dependencies);
    if (names.length === 0) return;

    const core = names.filter((name) => this.coreModules.has(name));
    if (core.length > 0) {
      throw new Error(`core packages must not be extension dependencies: ${core.join(", ")}`);
    }

    if (extension.source === "builtin") {
      assertInstalled(extension.root, names);
      return;
    }

    const receiptPath = join(this.cache, `${cacheKey(extension.manifest.id)}.json`);
    const fingerprint = dependenciesFingerprint(dependencies);
    if (
      await receiptMatches(receiptPath, extension.root, fingerprint)
      && installed(extension.root, names)
    ) {
      return;
    }

    await install(extension.root, join(this.cache, "bun"));
    assertInstalled(extension.root, names);
    await saveReceipt(receiptPath, {
      root: extension.root,
      dependencies: fingerprint,
    });
  }
}

async function readDependencies(root: string): Promise<Record<string, string>> {
  let source: string;
  try {
    source = await readFile(join(root, "package.json"), "utf8");
  } catch (error) {
    if (isMissing(error)) return {};
    throw error;
  }

  let manifest: PackageManifest;
  try {
    manifest = JSON.parse(source) as PackageManifest;
  } catch (error) {
    throw new Error(`invalid package.json: ${errorMessage(error)}`);
  }
  if (manifest.dependencies === undefined) return {};
  if (!isRecord(manifest.dependencies)) throw new Error("package dependencies must be an object");

  const dependencies: Record<string, string> = {};
  for (const [name, version] of Object.entries(manifest.dependencies)) {
    if (!name || typeof version !== "string" || !version.trim()) {
      throw new Error(`invalid package dependency: ${name || "<empty>"}`);
    }
    dependencies[name] = version;
  }
  return dependencies;
}

async function install(root: string, cache: string): Promise<void> {
  await mkdir(cache, { recursive: true });
  const child = Bun.spawn({
    cmd: [
      process.execPath,
      "install",
      "--cwd",
      root,
      "--production",
      "--omit=peer",
      "--ignore-scripts",
      "--backend=copyfile",
      "--cache-dir",
      cache,
      "--no-save",
      "--no-progress",
    ],
    cwd: root,
    env: process.env,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  if (exitCode === 0) return;
  const detail = stderr.trim() || stdout.trim() || `exit code ${exitCode}`;
  throw new Error(`dependency install failed: ${detail}`);
}

function assertInstalled(root: string, names: string[]): void {
  const missing = names.filter((name) => !resolves(name, root));
  if (missing.length > 0) {
    throw new Error(`missing package${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}`);
  }
}

function installed(root: string, names: string[]): boolean {
  return names.every((name) => resolves(name, root));
}

function resolves(name: string, root: string): boolean {
  try {
    Bun.resolveSync(name, root);
    return true;
  } catch {
    return false;
  }
}

async function receiptMatches(path: string, root: string, dependencies: string): Promise<boolean> {
  try {
    const receipt = JSON.parse(await readFile(path, "utf8")) as Partial<Receipt>;
    return receipt.root === root && receipt.dependencies === dependencies;
  } catch (error) {
    if (isMissing(error) || error instanceof SyntaxError) return false;
    throw error;
  }
}

async function saveReceipt(path: string, receipt: Receipt): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(receipt)}\n`, "utf8");
}

function dependenciesFingerprint(dependencies: Record<string, string>): string {
  const entries = Object.entries(dependencies).sort(([left], [right]) => left.localeCompare(right));
  return createHash("sha256").update(JSON.stringify(entries)).digest("hex").slice(0, 16);
}

function cacheKey(id: string): string {
  return createHash("sha256").update(id).digest("hex").slice(0, 16);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMissing(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
