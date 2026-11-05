import { errorCode } from '@sand/util/fs'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

export const stagingFolder = async (work: string, kind: 'incoming' | 'trash'): Promise<string> => {
  const folder = join(work, kind, Bun.randomUUIDv7())
  await mkdir(folder, { recursive: true })
  return folder
}

const blocked = new Set(['EPERM', 'EBUSY', 'EXDEV'])

export const renameBlocked = (error: unknown): boolean => blocked.has(errorCode(error) ?? '')
