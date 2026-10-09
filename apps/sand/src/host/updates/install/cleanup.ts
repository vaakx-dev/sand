import { readdir, rename, rm, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { samePath } from '@sand/host'
import { bunFolder, readBuildBun, validVersion } from '../../dist/bun/home'
import { buildStamp } from '../../dist/files'
import { appsFolder, readPointer } from '../../dist/layout'
import { readyFile } from './prepare'

const flatFolders = new Set(['apps', 'packages', 'plugins', 'node_modules'])
const unfinishedAge = 20 * 60 * 1000
const oldPrefix = '.old-'

const exists = (file: string) => stat(file).then(() => true, () => false)

const isOld = async (folder: string) => {
  const info = await stat(folder).catch(() => undefined)
  return !info || Date.now() - info.mtimeMs > unfinishedAge
}

const removable = async (folder: string, name: string) => {
  if (name.startsWith(oldPrefix)) return true
  if (name.startsWith('.incoming-')) return isOld(folder)
  if (name.startsWith('.') || flatFolders.has(name)) return false
  if (!(await exists(join(folder, buildStamp)))) return false
  return (await exists(join(folder, readyFile))) || isOld(folder)
}

const remove = async (path: string, name: string) => {
  const doomed = name.startsWith(oldPrefix) ? path : join(dirname(path), `${oldPrefix}${crypto.randomUUID()}`)
  if (doomed !== path && !(await rename(path, doomed).then(() => true, () => false))) return
  await rm(doomed, { recursive: true, force: true }).catch(() => {})
}

const folders = async (folder: string) =>
  (await readdir(folder, { withFileTypes: true }).catch(() => [])).filter(entry => entry.isDirectory()).map(entry => entry.name)

const cleanupApps = async (home: string, keep: string[]) => {
  const folder = appsFolder(home)
  const pointers = await Promise.all([readPointer(home, 'current'), readPointer(home, 'previous')])
  for (const name of await folders(folder)) {
    if (pointers.includes(name)) continue
    const path = join(folder, name)
    if (keep.some(kept => samePath(kept, path))) continue
    if (await removable(path, name).catch(() => false)) await remove(path, name)
  }
}

const bunsInUse = async (home: string) => {
  const folder = appsFolder(home)
  const roots = [folder, ...(await folders(folder)).filter(name => !name.startsWith('.')).map(name => join(folder, name))]
  const versions = await Promise.all(roots.map(root => readBuildBun(root)))
  return new Set([Bun.version, ...versions.filter(version => version !== undefined)])
}

const cleanupBuns = async (home: string) => {
  const used = await bunsInUse(home)
  const folder = bunFolder(home)
  for (const name of await folders(folder)) {
    if (used.has(name)) continue
    if (validVersion.test(name) || name.startsWith(oldPrefix)) await remove(join(folder, name), name)
  }
}

export const cleanupBuilds = async (home: string, keep: string[]): Promise<void> => {
  await cleanupApps(home, keep)
  await cleanupBuns(home).catch(() => {})
}
