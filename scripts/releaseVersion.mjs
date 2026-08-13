#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

const FILES = {
  packageJson: path.join(ROOT, "package.json"),
  packageLock: path.join(ROOT, "package-lock.json"),
  tauriConfig: path.join(ROOT, "src-tauri", "tauri.conf.json"),
  cargoManifest: path.join(ROOT, "src-tauri", "Cargo.toml"),
  cargoLock: path.join(ROOT, "src-tauri", "Cargo.lock"),
};

export function normalizeVersion(value) {
  const version = value.trim().replace(/^v/, "");
  if (!VERSION_PATTERN.test(version)) {
    throw new Error(`Invalid semantic version: ${value}`);
  }
  return version;
}

export function resolveCanaryVersion(currentVersion, date, runNumber) {
  const version = normalizeVersion(currentVersion);
  if (!/^\d{8}$/.test(date) || !isValidDate(date)) {
    throw new Error(`Invalid canary date: ${date}. Expected YYYYMMDD.`);
  }

  const run = Number(runNumber);
  if (!Number.isSafeInteger(run) || run < 1) {
    throw new Error(`Invalid canary run number: ${runNumber}`);
  }

  const [core] = version.split(/[-+]/, 1);
  const [major, minor, patch] = core.split(".");
  return `${major}.${minor}.${BigInt(patch) + 1n}-canary.${date}.${run}`;
}

async function readVersions() {
  const [packageSource, lockSource, tauriSource, manifestSource, cargoLockSource] =
    await Promise.all([
      readFile(FILES.packageJson, "utf8"),
      readFile(FILES.packageLock, "utf8"),
      readFile(FILES.tauriConfig, "utf8"),
      readFile(FILES.cargoManifest, "utf8"),
      readFile(FILES.cargoLock, "utf8"),
    ]);

  const packageJson = JSON.parse(packageSource);
  const packageLock = JSON.parse(lockSource);
  const tauriConfig = JSON.parse(tauriSource);

  return {
    packageJson: packageJson.version,
    packageLock: packageLock.version,
    packageLockRoot: packageLock.packages?.[""]?.version,
    tauriConfig: tauriConfig.version,
    cargoManifest: readTomlVersion(manifestSource, findManifestPackage),
    cargoLock: readTomlVersion(cargoLockSource, findSandPackage),
  };
}

async function checkVersion(expectedValue) {
  const versions = await readVersions();
  const expected = expectedValue
    ? normalizeVersion(expectedValue)
    : normalizeVersion(versions.packageJson);
  const mismatches = Object.entries(versions).filter(([, version]) => version !== expected);

  if (mismatches.length > 0) {
    const details = mismatches
      .map(([source, version]) => `  ${source}: ${version ?? "missing"}`)
      .join("\n");
    throw new Error(`Expected application version ${expected}:\n${details}`);
  }

  return expected;
}

async function setVersion(value) {
  const version = normalizeVersion(value);
  const [packageSource, lockSource, tauriSource, manifestSource, cargoLockSource] =
    await Promise.all([
      readFile(FILES.packageJson, "utf8"),
      readFile(FILES.packageLock, "utf8"),
      readFile(FILES.tauriConfig, "utf8"),
      readFile(FILES.cargoManifest, "utf8"),
      readFile(FILES.cargoLock, "utf8"),
    ]);

  const packageJson = JSON.parse(packageSource);
  const packageLock = JSON.parse(lockSource);
  const tauriConfig = JSON.parse(tauriSource);

  if (!packageLock.packages?.[""]) {
    throw new Error("package-lock.json does not contain the root package metadata.");
  }

  packageJson.version = version;
  packageLock.version = version;
  packageLock.packages[""].version = version;
  tauriConfig.version = version;

  const nextManifest = replaceTomlVersion(manifestSource, findManifestPackage, version);
  const nextCargoLock = replaceTomlVersion(cargoLockSource, findSandPackage, version);

  await Promise.all([
    writeJson(FILES.packageJson, packageJson),
    writeJson(FILES.packageLock, packageLock),
    writeJson(FILES.tauriConfig, tauriConfig),
    writeFile(FILES.cargoManifest, nextManifest),
    writeFile(FILES.cargoLock, nextCargoLock),
  ]);

  return version;
}

function findManifestPackage(source) {
  return findTomlBlock(source, /^\[[^\[\]\r\n]+\]\s*$/gm, (block) =>
    /^\[package\]\s*$/m.test(block),
  );
}

function findSandPackage(source) {
  return findTomlBlock(source, /^\[\[package\]\]\s*$/gm, (block) =>
    /^name\s*=\s*"sand"\s*$/m.test(block),
  );
}

function findTomlBlock(source, headerPattern, predicate) {
  const headers = [...source.matchAll(headerPattern)];
  for (let index = 0; index < headers.length; index += 1) {
    const start = headers[index].index;
    const end = headers[index + 1]?.index ?? source.length;
    if (predicate(source.slice(start, end))) {
      return { start, end };
    }
  }
  throw new Error("Could not find application package metadata in a TOML file.");
}

function readTomlVersion(source, findBlock) {
  const { start, end } = findBlock(source);
  const match = /^version\s*=\s*"([^"]+)"\s*$/m.exec(source.slice(start, end));
  if (!match) {
    throw new Error("Could not find the application version in a TOML package block.");
  }
  return match[1];
}

function replaceTomlVersion(source, findBlock, version) {
  const { start, end } = findBlock(source);
  const block = source.slice(start, end);
  const match = /^version\s*=\s*"([^"]+)"\s*$/m.exec(block);
  if (!match) {
    throw new Error("Could not find the application version in a TOML package block.");
  }

  const valueOffset = match.index + match[0].indexOf(match[1]);
  const valueStart = start + valueOffset;
  return `${source.slice(0, valueStart)}${version}${source.slice(valueStart + match[1].length)}`;
}

function isValidDate(value) {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function writeJson(file, value) {
  return writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

function usage() {
  return [
    "Usage:",
    "  npm run release:version -- check [version]",
    "  npm run release:version -- set <version>",
    "  npm run release:version -- canary <YYYYMMDD> <run-number>",
  ].join("\n");
}

async function main() {
  const [command, ...args] = process.argv.slice(2);

  switch (command) {
    case "check":
      if (args.length > 1) throw new Error(usage());
      console.log(await checkVersion(args[0]));
      return;
    case "set":
      if (args.length !== 1) throw new Error(usage());
      console.log(await setVersion(args[0]));
      return;
    case "canary": {
      if (args.length !== 2) throw new Error(usage());
      const currentVersion = await checkVersion();
      console.log(resolveCanaryVersion(currentVersion, args[0], args[1]));
      return;
    }
    default:
      throw new Error(usage());
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
