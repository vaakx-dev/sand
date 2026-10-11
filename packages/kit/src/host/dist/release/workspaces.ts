import { dirname, join, sep } from 'node:path'
import { isRecord } from '../../../json/record'
import { compare } from '../../../text/compare'
import { isLinkEntry, modulesFolder } from './manifest'

export type Manifest = Record<string, unknown>

interface WorkspacePackage {
  name: string
  dir: string
  path: string
  dependencies: string[]
}

export const readManifest = async (dir: string): Promise<Manifest | undefined> => {
  const manifest: unknown = await Bun.file(join(dir, 'package.json'))
    .json()
    .catch(() => undefined)
  return isRecord(manifest) ? manifest : undefined
}

export const dependencyNames = (deps: unknown) => (isRecord(deps) ? Object.keys(deps) : [])

const workspaceGlobs = (manifest: Manifest | undefined) => {
  const workspaces = manifest?.workspaces
  const globs = isRecord(workspaces) ? workspaces.packages : workspaces
  return Array.isArray(globs) ? globs.filter((glob): glob is string => typeof glob === 'string') : []
}

const toSlashes = (path: string) => path.split(sep).join('/')

export const workspacePackages = async (root: string): Promise<WorkspacePackage[]> => {
  const found = new Map<string, WorkspacePackage>()
  for (const glob of workspaceGlobs(await readManifest(root))) {
    for await (const file of new Bun.Glob(`${glob}/package.json`).scan({ cwd: root, onlyFiles: true })) {
      const path = toSlashes(dirname(file))
      if (path.split('/').includes(modulesFolder) || found.has(path)) continue
      const dir = join(root, path)
      const manifest = await readManifest(dir)
      const name = manifest?.name
      if (typeof name === 'string' && name) found.set(path, { name, dir, path, dependencies: dependencyNames(manifest?.dependencies) })
    }
  }
  return [...found.values()].sort((a, b) => compare(a.path, b.path))
}

export const workspaceLinks = async (root: string): Promise<Record<string, string>> => {
  const links: Record<string, string> = {}
  for (const { name, path } of await workspacePackages(root)) {
    const link = `${modulesFolder}/${name}`
    if (!isLinkEntry(link, path)) throw new Error(`sand cannot link the workspace package ${name} at ${path}`)
    if (links[link]) throw new Error(`two workspace packages are named ${name}: ${links[link]} and ${path}`)
    links[link] = path
  }
  return links
}
