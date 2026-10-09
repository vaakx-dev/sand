import { folderEntries } from '@sand/kit/fs'
import { join, resolve } from 'node:path'

const webOnly = async (dir: string) => {
  const manifest = Bun.file(join(dir, 'package.json'))
  if (!(await manifest.exists())) return false
  try {
    const { exports, main, sand } = await manifest.json()
    const runs = Boolean(main) || typeof exports === 'string' || (typeof exports === 'object' && exports !== null && '.' in exports)
    return Boolean(sand?.web) && !runs
  } catch {
    return false
  }
}

const folders = async (dir: string) => (await folderEntries(dir)).folders.map(name => resolve(dir, name))

export const discover = async (dir: string) => {
  const found = await folders(dir)
  const web = await Promise.all(found.map(webOnly))
  return found.filter((_, index) => !web[index])
}
