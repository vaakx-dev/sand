import { folderEntries } from '@sand/host'
import { join, resolve } from 'node:path'

const webOnly = async (dir: string) => {
  const manifest = Bun.file(join(dir, 'package.json'))
  if (!(await manifest.exists())) return false
  try {
    const { exports, main, sand } = await manifest.json()
    return Boolean(sand?.web) && !exports && !main
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
