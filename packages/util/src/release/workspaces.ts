import { dirname, join, sep } from 'node:path'
import { z } from 'zod'
import { compare } from '../text/compare'
import { isLinkEntry, modulesFolder } from './manifest'

interface WorkspacePackage {
  name: string
  dir: string
  path: string
  dependencies: string[]
}

const dependencies = z.record(z.string(), z.string()).default({})

const manifest = z.object({
  name: z.string().optional(),
  version: z.string().optional(),
  description: z.string().optional(),
  type: z.string().optional(),
  main: z.string().optional(),
  module: z.string().optional(),
  exports: z.union([z.string(), z.record(z.string(), z.json())]).optional(),
  dependencies,
  optionalDependencies: dependencies,
  workspaces: z.union([z.array(z.string()), z.object({ packages: z.array(z.string()) })]).optional(),
  sand: z.object({ feature: z.string().optional(), features: z.record(z.string(), z.json()).optional() }).optional(),
})

export type Manifest = z.output<typeof manifest>

export const readManifest = async (dir: string): Promise<Manifest> => manifest.parse(await Bun.file(join(dir, 'package.json')).json())

const workspaceGlobs = ({ workspaces = [] }: Manifest) => (Array.isArray(workspaces) ? workspaces : workspaces.packages)

const toSlashes = (path: string) => path.split(sep).join('/')

export const workspacePackages = async (root: string): Promise<WorkspacePackage[]> => {
  const found = new Map<string, WorkspacePackage>()
  for (const glob of workspaceGlobs(await readManifest(root))) {
    for await (const file of new Bun.Glob(`${glob}/package.json`).scan({ cwd: root, onlyFiles: true })) {
      const path = toSlashes(dirname(file))
      if (path.split('/').includes(modulesFolder) || found.has(path)) continue
      const dir = join(root, path)
      const { name, dependencies } = await readManifest(dir)
      if (name) found.set(path, { name, dir, path, dependencies: Object.keys(dependencies) })
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