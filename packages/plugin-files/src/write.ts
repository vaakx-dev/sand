import { exists, isLink, moveFresh, removeQuietly } from '@sand/util/fs'
import { mkdir, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { type PluginFile, writeFiles } from './file'
import { carryOver, unsharedPaths } from './keep'
import { safeRelative, unsharedName, validPluginName } from './names'
import { pluginsFolder, renameBlocked, stagingFolder } from './staging'

interface IncomingPlugin {
  home: string
  plugin: string
  files: PluginFile[]
}

const checkNames = ({ plugin, files }: IncomingPlugin) => {
  if (!validPluginName(plugin)) throw new Error(`Invalid plugin name: ${plugin}`)
  const unsafe = files.find(file => !safeRelative(file.path))
  if (unsafe) throw new Error(`${plugin} has an unsafe file path: ${unsafe.path}`)
}

const pruneStale = async (folder: string, keep: Set<string>, prefix = ''): Promise<boolean> => {
  const entries = await readdir(folder, { withFileTypes: true }).catch(() => [])
  let empty = true
  for (const entry of entries) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    const full = join(folder, entry.name)
    if (unsharedName(entry.name) || entry.isSymbolicLink() || keep.has(path)) {
      empty = false
    } else if (entry.isDirectory()) {
      if (await pruneStale(full, keep, path)) await rm(full, { recursive: true, force: true })
      else empty = false
    } else {
      await rm(full, { force: true })
    }
  }
  return empty
}

const writeInPlace = async (target: string, files: PluginFile[]) => {
  await mkdir(target, { recursive: true })
  await pruneStale(target, new Set(files.map(file => file.path)))
  await writeFiles(target, files)
}

export const writePlugin = async (incoming: IncomingPlugin): Promise<string> => {
  checkNames(incoming)
  const { home, plugin, files } = incoming
  const root = pluginsFolder(home)
  const target = join(root, plugin)
  if (await isLink(target)) throw new Error(`${plugin} is a linked folder on this PC; it is not synced`)
  const staging = await stagingFolder(home, 'incoming')
  try {
    await writeFiles(staging, files)
  } catch (error) {
    await removeQuietly(staging)
    throw error
  }
  const moved: string[] = []
  let trash: string | undefined
  const clear = async () => {
    await removeQuietly(staging)
    if (trash) await removeQuietly(trash)
  }
  const restore = async (): Promise<boolean> => {
    if (trash && !(await exists(target))) {
      const back = await moveFresh(join(trash, plugin), target).then(() => true, () => false)
      if (!back) return false
    }
    if (!moved.length) return true
    return mkdir(target, { recursive: true })
      .then(() => carryOver(staging, target, moved, []))
      .then(() => true, () => false)
  }
  try {
    await carryOver(target, staging, await unsharedPaths(target), moved)
    await mkdir(root, { recursive: true })
    if (await exists(target)) {
      trash = await stagingFolder(home, 'trash')
      await moveFresh(target, join(trash, plugin))
    }
    await moveFresh(staging, target)
  } catch (error) {
    if (!(await restore())) throw error
    try {
      if (!renameBlocked(error)) throw error
      await writeInPlace(target, files)
    } finally {
      await clear()
    }
    return target
  }
  if (trash) await removeQuietly(trash)
  return target
}
