import { join } from 'node:path'
import type { SyncedFolder } from './synced'

export interface FolderState {
  head: string | null
  pending: string | null
  ours: string | null
  conflicts: string[]
  unmarked: Record<string, string>
}

const emptyState = (): FolderState => ({ head: null, pending: null, ours: null, conflicts: [], unmarked: {} })

const file = (synced: SyncedFolder) => Bun.file(join(synced.dir, 'state.json'))

export const readState = async (synced: SyncedFolder): Promise<FolderState> => {
  const saved = await file(synced).json().catch(() => undefined)
  return { ...emptyState(), ...saved }
}

export const writeState = async (synced: SyncedFolder, state: FolderState) => {
  await synced.store.flush()
  await Bun.write(file(synced), JSON.stringify(state))
}

export const writeHead = (synced: SyncedFolder, head: string | null) => writeState(synced, { ...emptyState(), head })
