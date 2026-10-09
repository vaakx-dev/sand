import { realpath } from 'node:fs/promises'
import { isAbsolute, join, relative } from 'node:path'
import { modulesFolder } from './manifest'

interface PackageJson {
  name?: string
  workspaces?: string[] | { packages?: string[] }
  dependencies?: Record<string, string>
  exports?: unknown
  main?: string
  module?: string
}

interface Workspace {
  name: string
  dir: string
  dependencies: string[]
}

const readJson = (file: string): Promise<PackageJson | undefined> =>
  Bun.file(file)
    .json()
    .catch(() => undefined)

const workspaceGlobs = (pkg: PackageJson | undefined) => {
  const workspaces = pkg?.workspaces
  return Array.isArray(workspaces) ? workspaces : (workspaces?.packages ?? [])
}

const listWorkspaces = async (dir: string): Promise<Workspace[]> => {
  const found: Workspace[] = []
  for (const glob of workspaceGlobs(await readJson(join(dir, 'package.json')))) {
    for await (const file of new Bun.Glob(`${glob}/package.json`).scan({ cwd: dir, onlyFiles: true })) {
      if (file.split(/[\\/]/).includes(modulesFolder)) continue
      const pkg = await readJson(join(dir, file))
      if (!pkg?.name) continue
      found.push({ name: pkg.name, dir: join(dir, file, '..'), dependencies: Object.keys(pkg.dependencies ?? {}) })
    }
  }
  return found
}

const hasEntry = (pkg: PackageJson) => {
  if (pkg.main || pkg.module) return true
  const { exports } = pkg
  if (exports === undefined || exports === null) return false
  if (typeof exports !== 'object' || Array.isArray(exports)) return true
  const keys = Object.keys(exports)
  return !keys.every(key => key.startsWith('.')) || keys.includes('.')
}

const isInside = (root: string, path: string) => {
  const rel = relative(root, path)
  return !rel.startsWith('..') && !isAbsolute(rel)
}

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error)).split('\n')[0]

const locate = async (dir: string, workspace: Workspace, name: string) => {
  const manifest = join(dir, modulesFolder, name, 'package.json')
  const pkg = await readJson(manifest)
  if (!pkg) throw new Error('it is not in the sand folder')
  return hasEntry(pkg) ? Bun.resolveSync(name, workspace.dir) : manifest
}

const checkDependency = async (dir: string, real: string, workspace: Workspace, name: string) => {
  try {
    const found = await realpath(await locate(dir, workspace, name))
    return isInside(real, found) ? undefined : `${workspace.name} cannot load ${name}: it resolves outside the sand folder (${found})`
  } catch (error) {
    return `${workspace.name} cannot load ${name}: ${reason(error)}`
  }
}

export const checkResolution = async (dir: string) => {
  const real = await realpath(dir)
  const failures: string[] = []
  for (const workspace of await listWorkspaces(dir)) {
    for (const name of workspace.dependencies) {
      const failure = await checkDependency(dir, real, workspace, name)
      if (failure) failures.push(failure)
    }
  }
  if (failures.length) throw new Error(failures.join('\n'))
}
