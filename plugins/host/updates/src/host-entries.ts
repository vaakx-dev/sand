import { readdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { z } from 'zod'

const withHost = z.object({ sand: z.object({ host: z.string() }) })

const skipped = (name: string) => name.startsWith('.') || name === 'node_modules'

const hostEntry = async (dir: string) => {
  try {
    const manifest = withHost.safeParse(await Bun.file(join(dir, 'package.json')).json())
    return manifest.success ? [resolve(dir, manifest.data.sand.host)] : []
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
