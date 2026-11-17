import { realpath } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { compare } from '@sand/util'
import { type Manifest, modulesFolder, readManifest, workspacePackages } from '@sand/util/release'

interface RuntimeDep {
  name: string
  dir: string
  version: string
  path: string
}

interface Wanted {
  name: string
  from: string
  at: string
  by: string
  optional: boolean
}

interface Needed {
  name: string
  dir: string
  dependencies: string[]
}

interface DepsOptions {
  packages: Needed[]
  provided?: ReadonlySet<string>
}

const findInstalled = async (from: string, name: string) => {
  for (let dir = from; ; dir = dirname(dir)) {
    const folder = join(dir, modulesFolder, name)
    if (await Bun.file(join(folder, 'package.json')).exists()) return realpath(folder)
    if (dirname(dir) === dir) return undefined
  }
}

const placeUnder = (at: string, name: string) => (at ? `${at}/${modulesFolder}/${name}` : `${modulesFolder}/${name}`)

const visiblePlaces = (at: string, name: string) => {
  const owners = at.split(`/${modulesFolder}/`).map((_, index, parts) => parts.slice(0, index + 1).join(`/${modulesFolder}/`))
  return [...owners.filter(Boolean).reverse().map(owner => placeUnder(owner, name)), placeUnder('', name)]
}

const sameModule = (placed: RuntimeDep, dir: string, version: string) => placed.dir === dir || placed.version === version

const dependenciesOf = ({ dependencies, optionalDependencies }: Manifest, from: RuntimeDep): Wanted[] => [
  ...Object.keys(dependencies).map(name => ({ name, from: from.dir, at: from.path, by: from.name, optional: false })),
  ...Object.keys(optionalDependencies).map(name => ({ name, from: from.dir, at: from.path, by: from.name, optional: true })),
]

const runtimeDeps = async (root: string, { packages, provided = new Set() }: DepsOptions): Promise<RuntimeDep[]> => {
  const workspaceNames = new Set((await workspacePackages(root)).map(workspace => workspace.name))
  const placed = new Map<string, RuntimeDep>()

  const placeFor = ({ name, at, by }: Wanted, dir: string, version: string) => {
    const visible = visiblePlaces(at, name).find(path => placed.has(path))
    if (!visible) return placeUnder('', name)
    const known = placed.get(visible)!
    if (sameModule(known, dir, version)) return undefined
    if (!at) throw new Error(`sand needs one version of ${name}, found ${known.version} and ${version} (needed by ${by})`)
    return placeUnder(at, name)
  }

  const visit = async (wanted: Wanted): Promise<Wanted[]> => {
    const { name, from, by, optional } = wanted
    if (workspaceNames.has(name)) return []
    const dir = await findInstalled(from, name)
    if (!dir) {
      if (optional) return []
      throw new Error(`${name} (needed by ${by}) is not installed; run bun install`)
    }
    const manifest = await readManifest(dir)
    const version = manifest.version ?? ''
    const path = placeFor(wanted, dir, version)
    if (!path) return []
    const dep = { name, dir, version, path }
    placed.set(path, dep)
    return dependenciesOf(manifest, dep)
  }

  const direct = await Promise.all(
    packages.map(async workspace => {
      const from = await realpath(workspace.dir)
      return workspace.dependencies
        .filter(dep => !provided.has(dep))
        .map(name => ({ name, from, at: '', by: workspace.name, optional: false }))
    }),
  )
  for (let queue = direct.flat(); queue.length; ) {
    const next: Wanted[] = []
    for (const wanted of queue) next.push(...(await visit(wanted)))
    queue = next
  }
  return [...placed.values()].sort((a, b) => compare(a.path, b.path))
}

export { runtimeDeps }
