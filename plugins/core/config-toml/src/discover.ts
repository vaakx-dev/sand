import { folderEntries } from '@sand/kit/fs'
import { basename, join, resolve } from 'node:path'
import { builtin } from './plugins'

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

const discover = async (dir: string) => {
  const found = await folders(dir)
  const web = await Promise.all(found.map(webOnly))
  return found.filter((_, index) => !web[index])
}

export const userPlugins = async (dirs: string[], base: string) => {
  const overrides = new Map<string, string>()
  const others: string[] = []
  for (const dir of (await Promise.all(dirs.map(discover))).flat()) {
    const id = basename(dir)
    if (builtin(id, base)) overrides.set(id, dir)
    else others.push(dir)
  }
  return { overrides, others }
}
