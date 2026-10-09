import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { unsharedName } from './names'

const byPath = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

const entries = async (folder: string) => {
  try {
    return await readdir(folder, { withFileTypes: true })
  } catch {
    return []
  }
}

const collect = async (folder: string, prefix: string, out: string[]): Promise<void> => {
  for (const entry of await entries(folder)) {
    if (unsharedName(entry.name) || entry.isSymbolicLink()) continue
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) await collect(join(folder, entry.name), relative, out)
    else if (entry.isFile()) out.push(relative)
  }
}

export const pluginFiles = async (folder: string): Promise<string[]> => {
  const out: string[] = []
  await collect(folder, '', out)
  return out.sort(byPath)
}
