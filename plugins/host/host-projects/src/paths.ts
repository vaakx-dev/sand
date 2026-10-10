import { expandHome } from '@sand/kit/fs'
import { stat } from 'node:fs/promises'
import { isAbsolute } from 'node:path'

export const fullPath = (path: string) => {
  const clean = path.trim()
  if (!clean.startsWith('~') && !isAbsolute(clean)) throw new Error('Give a full path')
  return expandHome(clean)
}

export const existingFolder = async (path: string) => {
  const full = fullPath(path)
  const info = await stat(full).catch(() => undefined)
  if (!info?.isDirectory()) throw new Error(`${full} is not a folder`)
  return full
}
