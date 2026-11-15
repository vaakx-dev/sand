import { pathKey } from '@sand/git/contract'
import { serial } from '@sand/util'
import { isWithin, readState, writeAtomic } from '@sand/util/fs'
import type { WorkspaceKind } from '../contract'
import { reviveSetup } from '../setup/state'
import { type Stored, storedSchema, type WorktreeRecord } from './schema'

export type RecordStore = ReturnType<typeof createStore>

const revived = (stored: Stored): Stored => {
  const records = Object.values(stored.worktrees)
  for (const record of records) if (record.setup) reviveSetup(record.setup)
  return { ...stored, worktrees: Object.fromEntries(records.map(record => [pathKey(record.path), record])) }
}

const load = async (file: string): Promise<Stored> => {
  const stored = await readState(file, data => storedSchema.safeParse(data).data)
  return stored ? revived(stored) : { worktrees: {}, defaults: {} }
}

export const createStore = (file: string, hold: () => () => void) => {
  let data: Stored = { worktrees: {}, defaults: {} }
  let closed = false
  const write = serial()
  const loading = load(file).then(stored => {
    data = stored
  })

  const save = () =>
    write(async () => {
      await loading
      if (closed) return
      const release = hold()
      try {
        await writeAtomic(file, JSON.stringify(data, null, 2))
      } finally {
        release()
      }
    })

  const live = () => Object.values(data.worktrees).filter(record => !record.removed)

  return {
    ready: () => loading,
    get: (path: string): WorktreeRecord | undefined => data.worktrees[pathKey(path)],
    all: () => Object.values(data.worktrees),
    containing: (cwd: string) =>
      live()
        .filter(record => isWithin(cwd, record.path))
        .sort((a, b) => b.path.length - a.path.length)[0],
    put(record: WorktreeRecord) {
      data.worktrees[pathKey(record.path)] = record
      return save()
    },
    delete(path: string) {
      delete data.worktrees[pathKey(path)]
      return save()
    },
    save,
    defaults: (key: string): WorkspaceKind | undefined => data.defaults[key]?.kind,
    setDefaults(key: string, kind: WorkspaceKind) {
      data.defaults[key] = { kind }
      return save()
    },
    global: (): WorkspaceKind => data.global ?? 'checkout',
    setGlobal(kind: WorkspaceKind) {
      data.global = kind
      return save()
    },
    close() {
      closed = true
    },
  }
}
