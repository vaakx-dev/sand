import { expandHome } from '@sand/kit/fs'
import { errorMessage } from '@sand/kit'
import { dirname, isAbsolute } from 'node:path'

export type Table = Record<string, unknown>

export const isTable = (value: unknown): value is Table =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const isPath = (id: string) => id.startsWith('.') || id.startsWith('~') || isAbsolute(id)

const merge = (a: Table, b: Table): Table => {
  const merged = { ...a }
  for (const [key, value] of Object.entries(b)) {
    const current = merged[key]
    merged[key] = isTable(value) && isTable(current) ? merge(current, value) : value
  }
  return merged
}

const anchor = (table: Table, dir: string): Table => {
  if (!isTable(table.plugins)) return table
  const plugins = Object.entries(table.plugins).map(([id, config]) => [isPath(id) ? expandHome(id, dir) : id, config])
  return { ...table, plugins: Object.fromEntries(plugins) }
}

const parse = async (path: string) => {
  try {
    return Bun.TOML.parse(await Bun.file(path).text()) as Table
  } catch (error) {
    throw new Error(`${path}: ${errorMessage(error)}`)
  }
}

export const readConfig = async (paths: string[]) => {
  let config: Table = {}
  for (const path of paths) {
    if (await Bun.file(path).exists()) config = merge(config, anchor(await parse(path), dirname(path)))
  }
  return config
}
