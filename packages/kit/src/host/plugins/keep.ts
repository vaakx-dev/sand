import { mkdir, readdir, rename } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { unsharedName } from './names'
import { exists } from './staging'

export const unsharedPaths = async (folder: string, prefix = ''): Promise<string[]> => {
  const entries = await readdir(folder, { withFileTypes: true }).catch(() => [])
  const out: string[] = []
  for (const entry of entries) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    if (unsharedName(entry.name) || entry.isSymbolicLink()) out.push(path)
    else if (entry.isDirectory()) out.push(...(await unsharedPaths(join(folder, entry.name), path)))
  }
  return out
}

const at = (base: string, path: string) => join(base, ...path.split('/'))

export const carryOver = async (from: string, to: string, paths: string[], moved: string[]): Promise<void> => {
  for (const path of paths) {
    const target = at(to, path)
    if (await exists(target)) continue
    const parent = await mkdir(dirname(target), { recursive: true }).then(() => true, () => false)
    if (!parent) continue
    await rename(at(from, path), target)
    moved.push(path)
  }
}
