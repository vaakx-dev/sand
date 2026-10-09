import { chmod, mkdir, readdir, rename, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { PluginFiles } from '@sand/protocol'
import { fileHash, treeHash } from '../hash'
import { safeRelative, unsharedName, validPluginName } from '../names'
import { carryOver, unsharedPaths } from './keep'
import { exists, isLink, removeQuietly, renameBlocked, stagingFolder } from './staging'

interface DecodedFile {
  path: string
  bytes: Uint8Array
  executable: boolean
}

const decode = (incoming: PluginFiles): DecodedFile[] => {
  const { plugin } = incoming
  if (!validPluginName(plugin)) throw new Error(`Invalid plugin name: ${plugin}`)
  const files = incoming.files.map(file => {
    if (!safeRelative(file.path)) throw new Error(`${plugin} has an unsafe file path: ${file.path}`)
    return { path: file.path, bytes: new Uint8Array(Buffer.from(file.data, 'base64')), executable: file.executable }
  })
  const hashes = Object.fromEntries(files.map(file => [file.path, fileHash(file.bytes)]))
  if (Object.keys(hashes).length !== files.length || treeHash(hashes) !== incoming.hash)
    throw new Error(`${plugin} arrived damaged; try again`)
  return files
}

const writeFiles = async (base: string, files: DecodedFile[]) => {
  for (const file of files) {
    const path = join(base, ...file.path.split('/'))
    await mkdir(dirname(path), { recursive: true })
    await Bun.write(path, file.bytes)
    if (process.platform !== 'win32') await chmod(path, file.executable ? 0o755 : 0o644)
  }
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

const writeInPlace = async (target: string, files: DecodedFile[]) => {
  await mkdir(target, { recursive: true })
  await pruneStale(target, new Set(files.map(file => file.path)))
  await writeFiles(target, files)
}

export const writePlugin = async (root: string, work: string, incoming: PluginFiles): Promise<void> => {
  const files = decode(incoming)
  const target = join(root, incoming.plugin)
  if (await isLink(target)) throw new Error(`${incoming.plugin} is a linked folder on this PC; it is not synced`)
  const staging = await stagingFolder(work, 'incoming')
  try {
    await writeFiles(staging, files)
  } catch (error) {
    await removeQuietly(staging)
    throw error
  }
  const moved: string[] = []
  let trash: string | undefined
  const restore = async (): Promise<boolean> => {
    if (trash && !(await exists(target))) {
      const back = await rename(join(trash, incoming.plugin), target).then(() => true, () => false)
      if (!back) return false
    }
    if (moved.length) {
      await mkdir(target, { recursive: true }).catch(() => {})
      await carryOver(staging, target, moved, []).catch(() => {})
    }
    return true
  }
  try {
    await carryOver(target, staging, await unsharedPaths(target), moved)
    await mkdir(root, { recursive: true })
    if (await exists(target)) {
      trash = await stagingFolder(work, 'trash')
      await rename(target, join(trash, incoming.plugin))
    }
    await rename(staging, target)
  } catch (error) {
    if (!(await restore())) throw error
    if (!renameBlocked(error)) {
      await removeQuietly(staging)
      if (trash) await removeQuietly(trash)
      throw error
    }
    try {
      await writeInPlace(target, files)
    } finally {
      await removeQuietly(staging)
      if (trash) await removeQuietly(trash)
    }
    return
  }
  if (trash) await removeQuietly(trash)
}
