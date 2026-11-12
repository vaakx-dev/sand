import { errorCode } from '@sand/util/fs'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

export const pluginsFolder = (home: string) => join(home, 'plugins')

export const stagingFolder = async (home: string, kind: 'incoming' | 'trash'): Promise<string> => {
  const folder = join(home, 'plugin-staging', kind, Bun.randomUUIDv7())
  await mkdir(folder, { recursive: true })
  return folder
}

const blocked = new Set(['EPERM', 'EBUSY', 'EXDEV'])

export const renameBlocked = (error: unknown): boolean => blocked.has(errorCode(error) ?? '')
