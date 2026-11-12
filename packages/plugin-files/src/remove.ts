import { removeQuietly } from '@sand/util/fs'
import { lstat, readdir, rename, rm, rmdir, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { validPluginName } from './names'
import { pluginsFolder, stagingFolder } from './staging'

const windows = process.platform === 'win32'

export const removeLink = (path: string) => unlink(path).catch(error => (windows ? rmdir(path) : Promise.reject(error)))

const linksIn = async (folder: string): Promise<string[]> => {
  const entries = await readdir(folder, { withFileTypes: true }).catch(() => [])
  const found = await Promise.all(
    entries.map(entry => {
      const path = join(folder, entry.name)
      if (entry.isSymbolicLink()) return [path]
      return entry.isDirectory() && entry.name.startsWith('@') ? linksIn(path) : []
    }),
  )
  return found.flat()
}

export const removeFolder = async (folder: string) => {
  for (const link of await linksIn(join(folder, 'node_modules'))) await removeLink(link)
  await rm(folder, { recursive: true, force: true })
}

export const removePlugin = async (home: string, plugin: string): Promise<void> => {
  if (!validPluginName(plugin)) throw new Error(`Invalid plugin name: ${plugin}`)
  const target = join(pluginsFolder(home), plugin)
  const info = await lstat(target).catch(() => undefined)
  if (!info) return
  if (info.isSymbolicLink()) return removeLink(target)
  const trash = await stagingFolder(home, 'trash')
  const moved = join(trash, plugin)
  const removing = await rename(target, moved).then(() => moved, () => target)
  await removeFolder(removing)
  await removeQuietly(trash)
}
