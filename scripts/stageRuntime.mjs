import { cp, mkdir, readFile, readdir, realpath, rm } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const outputRoot = join(projectRoot, "build", "runtime");
const sourceModules = join(projectRoot, "node_modules");
const coreConfiguration = JSON.parse(
  await readFile(join(projectRoot, "runtime", "coreModules.json"), "utf8"),
);
if (
  !Array.isArray(coreConfiguration)
  || coreConfiguration.length === 0
  || coreConfiguration.some((name) => typeof name !== "string" || !name)
  || new Set(coreConfiguration).size !== coreConfiguration.length
) {
  throw new Error("invalid runtime/coreModules.json");
}
const coreModules = new Set(coreConfiguration);
const stagedPackages = new Map();

await rm(outputRoot, { recursive: true, force: true });
await Promise.all([
  copy("runtime"),
  copy("extensions"),
]);

for (const name of coreConfiguration) await copyCorePackage(name);
await stageExtensionDependencies();

async function copy(path) {
  await cp(join(projectRoot, path), join(outputRoot, path), { recursive: true });
}

async function stageExtensionDependencies() {
  const extensionsRoot = join(projectRoot, "extensions");
  const entries = await readdir(extensionsRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const root = join(extensionsRoot, entry.name);
    const manifest = await packageManifest(root);
    if (!manifest) continue;
    const dependencies = dependencyNames(manifest);
    const invalid = dependencies.filter((name) => coreModules.has(name));
    if (invalid.length > 0) {
      throw new Error(`${entry.name} declares core dependencies: ${invalid.join(", ")}`);
    }
    const destination = join(outputRoot, "extensions", entry.name, "node_modules");
    for (const name of dependencies) await copyPackage(name, destination, root);
  }
}

async function packageManifest(root) {
  try {
    return JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function dependencyNames(manifest) {
  if (manifest.dependencies === undefined) return [];
  if (!record(manifest.dependencies)) throw new Error("package dependencies must be an object");
  return Object.keys(manifest.dependencies).sort();
}

async function copyPackage(name, destinationModules, importer = projectRoot) {
  const source = await resolvePackage(name, importer);
  const sourceRoot = await realpath(source);
  const staged = stagedPackages.get(destinationModules) ?? new Set();
  stagedPackages.set(destinationModules, staged);
  if (staged.has(sourceRoot)) return;
  staged.add(sourceRoot);

  const relativePath = relative(sourceModules, sourceRoot);
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new Error(`package is outside node_modules: ${name}`);
  }

  const destination = join(destinationModules, relativePath);
  await mkdir(dirname(destination), { recursive: true });
  await cp(sourceRoot, destination, { recursive: true });
  await copyPackageDependencies(sourceRoot, destinationModules);
}

async function copyCorePackage(name) {
  const source = await resolvePackage(name, projectRoot);
  const sourceRoot = await realpath(source);
  const destinationModules = join(outputRoot, "node_modules");
  const staged = stagedPackages.get(destinationModules) ?? new Set();
  stagedPackages.set(destinationModules, staged);
  if (staged.has(sourceRoot)) return;
  staged.add(sourceRoot);

  const destination = join(destinationModules, name);
  await mkdir(dirname(destination), { recursive: true });
  await cp(sourceRoot, destination, { recursive: true });

  await copyPackageDependencies(sourceRoot, destinationModules);
}

async function copyPackageDependencies(sourceRoot, destinationModules) {
  const manifest = JSON.parse(await readFile(join(sourceRoot, "package.json"), "utf8"));
  const required = {
    ...(record(manifest.dependencies) ? manifest.dependencies : {}),
    ...(record(manifest.peerDependencies) ? manifest.peerDependencies : {}),
  };
  const optional = {
    ...(record(manifest.optionalDependencies) ? manifest.optionalDependencies : {}),
    ...optionalPeers(manifest),
  };
  for (const dependency of Object.keys(required)) {
    if (dependency in optional || coreModules.has(dependency)) continue;
    await copyPackage(dependency, destinationModules, sourceRoot);
  }
  for (const dependency of Object.keys(optional)) {
    if (coreModules.has(dependency)) continue;
    await copyOptionalPackage(dependency, destinationModules, sourceRoot);
  }
}

async function copyOptionalPackage(name, destinationModules, importer) {
  if (!await findPackage(name, importer)) return;
  await copyPackage(name, destinationModules, importer);
}

async function resolvePackage(name, importer) {
  const resolved = await findPackage(name, importer);
  if (resolved) return resolved;
  throw new Error(`package is not installed: ${name}`);
}

async function findPackage(name, importer) {
  let directory = importer;
  while (true) {
    const candidate = join(directory, "node_modules", name);
    try {
      await readFile(join(candidate, "package.json"));
      return candidate;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    const parent = dirname(directory);
    if (parent === directory) return null;
    directory = parent;
  }
}

function optionalPeers(manifest) {
  if (!record(manifest.peerDependenciesMeta)) return {};
  return Object.fromEntries(Object.entries(manifest.peerDependenciesMeta)
    .filter(([, meta]) => record(meta) && meta.optional === true)
    .map(([name]) => [name, true]));
}

function record(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
