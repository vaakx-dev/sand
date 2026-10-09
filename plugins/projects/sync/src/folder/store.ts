import { join } from 'node:path'
import type { Hidden } from './hidden'

export interface FolderState {
  head: string | null
  pending: string | null
  ours: string | null
  conflicts: string[]
  unmarked: Record<string, string>
}

export const emptyState = (): FolderState => ({ head: null, pending: null, ours: null, conflicts: [], unmarked: {} })

const file = (hidden: Hidden) => Bun.file(join(hidden.dir, 'state.json'))

export const readState = async (hidden: Hidden): Promise<FolderState> => {
  const saved = await file(hidden).json().catch(() => undefined)
  return { ...emptyState(), ...saved }
}

export const writeState = async (hidden: Hidden, state: FolderState) => {
  await Bun.write(file(hidden), JSON.stringify(state))
}
