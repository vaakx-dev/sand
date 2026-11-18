import { errorCode } from '@sand/util/fs'
import { existsSync } from 'node:fs'
import { lstat, readdir, rmdir, unlink } from 'node:fs/promises'
import { join } from 'node:path'

const HELD_CODES = new Set(['EBUSY', 'ENOTEMPTY'])

const removeFolder = (path: string) =>
  rmdir(path).catch(error => {
    if (HELD_CODES.has(errorCode(error) ?? '')) return
    throw error
  })

export const isWorktree = (path: string) => existsSync(join(path, '.git'))

export const clearFolder = async (path: string): Promise<void> => {
  const info = await lstat(path).catch(() => undefined)
  if (!info) return
  if (info.isSymbolicLink()) return unlinkLink(path)
  if (!info.isDirectory()) return unlink(path)
  for (const name of await readdir(path)) await clearFolder(join(path, name))
  await removeFolder(path)
}

const unlinkLink = async (path: string) => {
  await unlink(path).catch(async error => {
    if (process.platform !== 'win32') throw error
    await rmdir(path)
  })
}

export const clearLeftover = async (path: string) => {
  if (isWorktree(path)) return
  await clearFolder(path)
}
