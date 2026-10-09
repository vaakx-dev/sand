import { unsharedName } from '@sand/kit/host'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

export interface BuiltinPlugin {
  name: string
  area: string
  folder: string
}

const walk = async (dir: string, area: string[], out: BuiltinPlugin[]): Promise<void> => {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  for (const entry of entries) {
    if (!entry.isDirectory() || unsharedName(entry.name)) continue
    if (area.length === 0 && entry.name === 'host') continue
    const folder = join(dir, entry.name)
    if (await Bun.file(join(folder, 'package.json')).exists()) out.push({ name: entry.name, area: area.join('/'), folder })
    else await walk(folder, [...area, entry.name], out)
  }
}

export const builtinPlugins = async (appRoot: string): Promise<Map<string, BuiltinPlugin>> => {
  const out: BuiltinPlugin[] = []
  await walk(join(appRoot, 'plugins'), [], out)
  return new Map(out.map(plugin => [plugin.name, plugin]))
}
