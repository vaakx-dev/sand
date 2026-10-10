import { errorMessage, isRecord } from '@sand/kit'
import { expandHome } from '@sand/kit/fs'
import { dirname, isAbsolute } from 'node:path'

type Table = Record<string, unknown>

const isPath = (id: string) => id.startsWith('.') || id.startsWith('~') || isAbsolute(id)

const anchor = (table: Table, dir: string): Table => {
  if (!isRecord(table.plugins)) return table
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

export const readConfig = async (path: string): Promise<Table> => {
  if (!(await Bun.file(path).exists())) return {}
  return anchor(await parse(path), dirname(path))
}
