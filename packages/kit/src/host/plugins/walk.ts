import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { compare } from '../../text/compare'
import { unsharedName } from './names'

const collect = async (folder: string, prefix: string, out: string[]): Promise<void> => {
  for (const entry of await readdir(folder, { withFileTypes: true }).catch(() => [])) {
    if (unsharedName(entry.name) || entry.isSymbolicLink()) continue
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) await collect(join(folder, entry.name), relative, out)
    else if (entry.isFile()) out.push(relative)
  }
}

export const pluginFiles = async (folder: string): Promise<string[]> => {
  const out: string[] = []
  await collect(folder, '', out)
  return out.sort(compare)
}
