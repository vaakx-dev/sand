import { realpath } from 'node:fs/promises'
import { join } from 'node:path'
import { errorMessage } from '../../../text/error'
import { isInside } from '../../../text/paths'
import { modulesFolder } from './manifest'
import { readManifest, workspacePackages, type Manifest } from './workspaces'

const hasEntry = ({ main, module, exports }: Manifest) => {
  if (main || module) return true
  if (exports === undefined || exports === null) return false
  if (typeof exports !== 'object' || Array.isArray(exports)) return true
  const keys = Object.keys(exports)
  return !keys.every(key => key.startsWith('.')) || keys.includes('.')
}

const reason = (error: unknown) => errorMessage(error).split('\n')[0]

const locate = async (dir: string, from: string, name: string) => {
  const folder = join(dir, modulesFolder, name)
  const manifest = await readManifest(folder)
  if (!manifest) throw new Error('it is not in the sand folder')
  return hasEntry(manifest) ? Bun.resolveSync(name, from) : join(folder, 'package.json')
}

const checkDependency = async (dir: string, real: string, workspace: { name: string; dir: string }, name: string) => {
  try {
    const found = await realpath(await locate(dir, workspace.dir, name))
    return isInside(found, real) ? undefined : `${workspace.name} cannot load ${name}: it resolves outside the sand folder (${found})`
  } catch (error) {
    return `${workspace.name} cannot load ${name}: ${reason(error)}`
  }
}

export const checkResolution = async (dir: string) => {
  const real = await realpath(dir)
  const failures: string[] = []
  for (const workspace of await workspacePackages(dir)) {
    for (const name of workspace.dependencies) {
      const failure = await checkDependency(dir, real, workspace, name)
      if (failure) failures.push(failure)
    }
  }
  if (failures.length) throw new Error(failures.join('\n'))
}
