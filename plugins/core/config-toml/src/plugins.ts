import { isRecord } from '@sand/kit'
import { existsSync } from 'node:fs'
import { dirname, isAbsolute, join } from 'node:path'

export const builtin = (id: string, base: string) => {
  try {
    return dirname(Bun.resolveSync(`@sand/${id}/package.json`, base))
  } catch {
    return undefined
  }
}

export const entries = (defaults: string[], table: unknown, extra: boolean) => {
  const plugins = new Map<string, Record<string, unknown>>(defaults.map(id => [id, {}]))
  for (const [id, config] of Object.entries(isRecord(table) ? table : {})) {
    const { enabled = true, ...rest } = isRecord(config) ? config : {}
    if (!extra && !plugins.has(id)) continue
    if (enabled === false) plugins.delete(id)
    else plugins.set(id, { ...plugins.get(id), ...rest })
  }
  return plugins
}

export const locate = (id: string, base: string, folder?: string) => {
  if (isAbsolute(id)) return id
  const found = builtin(id, base)
  if (found) return found
  const local = folder && join(folder, id)
  if (local && existsSync(join(local, 'package.json'))) return local
  throw new Error(`Unknown plugin "${id}"`)
}
