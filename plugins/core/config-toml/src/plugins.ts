import { existsSync } from 'node:fs'
import { dirname, isAbsolute, join } from 'node:path'
import { isTable, type Table } from './read'

export const entries = (defaults: string[], table: unknown) => {
  const plugins = new Map<string, Table>(defaults.map(id => [id, {}]))
  for (const [id, config] of Object.entries(isTable(table) ? table : {})) {
    const { enabled = true, ...rest } = isTable(config) ? config : {}
    if (enabled === false) plugins.delete(id)
    else plugins.set(id, { ...plugins.get(id), ...rest })
  }
  return plugins
}

export const locate = (id: string, base: string, folder?: string) => {
  if (isAbsolute(id)) return id
  try {
    return dirname(Bun.resolveSync(`@sand/${id}/package.json`, base))
  } catch {
    const local = folder && join(folder, id)
    if (local && existsSync(join(local, 'package.json'))) return local
    throw new Error(`Unknown plugin "${id}"`)
  }
}
