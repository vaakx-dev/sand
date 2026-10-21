import { realpath } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { compare } from '@sand/util'
import { dependencyNames, modulesFolder, readManifest, workspacePackages } from '@sand/util/boot/release'

interface RuntimeDep {
  name: string
  dir: string
  version: string
}

interface Wanted {
  name: string
  from: string
  by: string
  optional: boolean
}

const findInstalled = async (from: string, name: string) => {
  for (let dir = from; ; dir = dirname(dir)) {
    const folder = join(dir, modulesFolder, name)
    if (await Bun.file(join(folder, 'package.json')).exists()) return realpath(folder)
    if (dirname(dir) === dir) return undefined
  }
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
    const version = typeof manifest?.version === 'string' ? manifest.version : ''
    const known = found.get(name)
    if (known) {
      if (known.dir === dir || known.version === version) return
      throw new Error(`sand needs one version of ${name}, found ${known.version} and ${version}`)
    }
    found.set(name, { name, dir, version })
    for (const dep of dependencyNames(manifest?.dependencies)) await visit({ name: dep, from: dir, by: name, optional: false })
    for (const dep of dependencyNames(manifest?.optionalDependencies)) await visit({ name: dep, from: dir, by: name, optional: true })
  }

  for (const workspace of workspaces) {
    const from = await realpath(workspace.dir)
    for (const dep of workspace.dependencies) await visit({ name: dep, from, by: workspace.name, optional: false })
  }
  return [...found.values()].sort((a, b) => compare(a.name, b.name))
}
