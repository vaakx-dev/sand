import type { WorktreeSetup } from '../contract'
import { join } from 'node:path'

const strings = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '') : [])

const read = async (folder: string) => {
  const file = Bun.file(join(folder, '.sand', 'worktree.toml'))
  if (!(await file.exists())) return undefined
  try {
    return Bun.TOML.parse(await file.text()) as Record<string, unknown>
  } catch {
    return undefined
  }
}

export const readSetup = async (folders: string[], autoSettle: boolean): Promise<WorktreeSetup> => {
  for (const folder of folders) {
    const table = await read(folder)
    if (table) return { copy: strings(table.copy), run: strings(table.run), autoSettle: autoSettle && table.auto_settle !== false }
  }
  return { copy: [], run: [], autoSettle }
}
