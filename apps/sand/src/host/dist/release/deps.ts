import { realpath } from 'node:fs/promises'
import { dirname, join, sep } from 'node:path'

export interface WorkspacePackage {
  name: string
  dir: string
  path: string
}

export interface RuntimeDep {
  name: string
  dir: string
  version: string
}

interface Manifest {
  name?: unknown
  version?: unknown
  workspaces?: unknown
  dependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
}

const readManifest = async (dir: string): Promise<Manifest> => {
  const manifest = await Bun.file(join(dir, 'package.json'))
    .json()
    .catch(() => undefined)
  return manifest && typeof manifest === 'object' ? manifest : {}
}

const workspaceGlobs = (manifest: Manifest) => {
  const { workspaces } = manifest
  const globs = Array.isArray(workspaces) ? workspaces : (workspaces as { packages?: unknown } | undefined)?.packages
  return Array.isArray(globs) ? globs.filter((glob): glob is string => typeof glob === 'string') : []
}

const toSlashes = (path: string) => path.split(sep).join('/')

export const workspacePackages = async (root: string): Promise<WorkspacePackage[]> => {
  const found = new Map<string, WorkspacePackage>()
  for (const glob of workspaceGlobs(await readManifest(root))) {
    for await (const file of new Bun.Glob(`${glob}/package.json`).scan({ cwd: root, onlyFiles: true })) {
      const path = toSlashes(dirname(file))
      if (path.split('/').includes('node_modules') || found.has(path)) continue
      const dir = join(root, path)
      const { name } = await readManifest(dir)
      if (typeof name === 'string' && name) found.set(path, { name, dir, path })
    }
  }
  return [...found.values()].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
}

const dependencyNames = (deps: Record<string, string> | undefined) => (deps && typeof deps === 'object' ? Object.keys(deps) : [])

const findInstalled = async (from: string, name: string) => {
  for (let dir = from; ; dir = dirname(dir)) {
    const folder = join(dir, 'node_modules', name)
    if (await Bun.file(join(folder, 'package.json')).exists()) return realpath(folder)
    if (dirname(dir) === dir) return undefined
  }
}

interface Wanted {
  name: string
  from: string
  by: string
  optional: boolean
}

export const runtimeDeps = async (root: string): Promise<RuntimeDep[]> => {
  const workspaces = await workspacePackages(root)
  const workspaceNames = new Set(workspaces.map(workspace => workspace.name))
  const found = new Map<string, RuntimeDep>()

  const visit = async ({ name, from, by, optional }: Wanted): Promise<void> => {
    if (workspaceNames.has(name)) return
    const dir = await findInstalled(from, name)
    if (!dir) {
      if (optional) return
      throw new Error(`${name} (needed by ${by}) is not installed; run bun install`)
    }
    const manifest = await readManifest(dir)
    const version = typeof manifest.version === 'string' ? manifest.version : ''
    const known = found.get(name)
    if (known) {
      if (known.dir === dir || known.version === version) return
      throw new Error(`sand needs one version of ${name}, found ${known.version} and ${version}`)
    }
    found.set(name, { name, dir, version })
    for (const dep of dependencyNames(manifest.dependencies)) await visit({ name: dep, from: dir, by: name, optional: false })
    for (const dep of dependencyNames(manifest.optionalDependencies)) await visit({ name: dep, from: dir, by: name, optional: true })
  }

  for (const workspace of workspaces) {
    const from = await realpath(workspace.dir)
    for (const dep of dependencyNames((await readManifest(workspace.dir)).dependencies)) {
      await visit({ name: dep, from, by: workspace.name, optional: false })
    }
  }
  return [...found.values()].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
}
