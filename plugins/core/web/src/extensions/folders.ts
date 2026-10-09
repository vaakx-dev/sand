import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

const skipped = (name: string) => name.startsWith('.') || name === 'node_modules'

export const pluginFolders = async (dir: string, nested: boolean): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  const found = await Promise.all(
    entries
      .filter(entry => (entry.isDirectory() || entry.isSymbolicLink()) && !skipped(entry.name))
      .map(async entry => {
        const child = join(dir, entry.name)
        if (await Bun.file(join(child, 'package.json')).exists()) return [child]
        return nested ? pluginFolders(child, nested) : []
      }),
  )
  return found.flat().sort()
}
