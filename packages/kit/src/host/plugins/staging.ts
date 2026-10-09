import { lstat, mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'

export const stagingFolder = async (work: string, kind: 'incoming' | 'trash'): Promise<string> => {
  const folder = join(work, kind, Bun.randomUUIDv7())
  await mkdir(folder, { recursive: true })
  return folder
}

export const removeQuietly = (path: string) => rm(path, { recursive: true, force: true }).catch(() => {})

export const exists = (path: string): Promise<boolean> => lstat(path).then(() => true, () => false)

export const isLink = (path: string): Promise<boolean> => lstat(path).then(info => info.isSymbolicLink(), () => false)

export const renameBlocked = (error: unknown): boolean => {
  const code = (error as { code?: unknown } | null)?.code
  return code === 'EPERM' || code === 'EBUSY' || code === 'EXDEV'
}
