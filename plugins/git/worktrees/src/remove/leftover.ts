import { existsSync } from 'node:fs'
import { lstat, readdir, rmdir, unlink } from 'node:fs/promises'
import { join } from 'node:path'

export const isWorktree = (path: string) => existsSync(join(path, '.git'))

const clear = async (path: string): Promise<void> => {
  const info = await lstat(path).catch(() => undefined)
  if (!info) return
  if (info.isSymbolicLink()) return unlinkLink(path)
  if (!info.isDirectory()) return unlink(path)
  for (const name of await readdir(path)) await clear(join(path, name))
  await rmdir(path)
}

const unlinkLink = async (path: string) => {
  await unlink(path).catch(async error => {
    if (process.platform !== 'win32') throw error
    await rmdir(path)
  })
}

export const clearLeftover = async (path: string) => {
  if (isWorktree(path)) return
  await clear(path)
}
