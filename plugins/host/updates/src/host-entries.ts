import { isRecord } from '@sand/util'
import { readdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const skipped = (name: string) => name.startsWith('.') || name === 'node_modules'

const hostEntry = async (dir: string) => {
  try {
    const { sand } = await Bun.file(join(dir, 'package.json')).json()
    return isRecord(sand) && typeof sand.host === 'string' ? [resolve(dir, sand.host)] : []
  } catch {
    return []
  }
}

const walk = async (dir: string): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  const found = await Promise.all(
    entries
      .filter(entry => entry.isDirectory() && !skipped(entry.name))
      .map(async entry => {
        const child = join(dir, entry.name)
        return (await Bun.file(join(child, 'package.json')).exists()) ? hostEntry(child) : walk(child)
      }),
  )
  return found.flat()
}

export const hostEntries = async (root: string) => [
  join(root, 'apps', 'sand', 'src', 'main.ts'),
  join(root, 'plugins', 'core', 'config', 'src', 'index.ts'),
  ...(await walk(join(root, 'plugins'))),
]
