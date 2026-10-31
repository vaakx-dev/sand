import type { Wire } from '@sand/devices-contract'
import { gitPatch, type DiffFile, type DiffPatch, type DiffScope } from '@sand/git-diff/contract'
import type { GitPlace } from '@sand/git/contract'
import { sig, type Sig } from '@vaakx-dev/vrui'
import { patchRows, type PatchRows } from '../patch/rows'
import { messageOf } from './message'

export type PatchState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; patch: DiffPatch; rows: PatchRows }
  | { kind: 'error'; message: string }

export interface DiffTarget {
  at: GitPlace
  scope: DiffScope
}

interface Entry {
  file: DiffFile
  state: Sig<PatchState>
  near: boolean
  stale: boolean
  ticket: number
}

const idle: PatchState = { kind: 'idle' }

export const patchStore = (wire: Wire, replaced: (path: string) => void) => {
  let target: DiffTarget | undefined
  let entries = new Map<string, Entry>()

  const load = async (entry: Entry) => {
    const goal = target
    if (!goal) return
    const mine = ++entry.ticket
    entry.stale = false
    if (entry.state.get().kind !== 'ready') entry.state.set({ kind: 'loading' })
    const { path, from } = entry.file
    try {
      const patch = await wire.call(gitPatch, { cwd: goal.at.cwd, scope: goal.scope, path, from }, goal.at.device)
      if (mine !== entry.ticket || goal !== target) return
      entry.state.set({ kind: 'ready', patch, rows: patchRows(patch) })
      replaced(path)
    } catch (error) {
      if (mine === entry.ticket && goal === target) entry.state.set({ kind: 'error', message: messageOf(error) })
    }
  }

  const refresh = (entry: Entry) => {
    if (entry.state.get().kind === 'idle') return
    entry.stale = true
    if (entry.near) void load(entry)
  }

  return {
    reset(next: DiffTarget | undefined) {
      target = next
      for (const entry of entries.values()) entry.ticket++
      entries = new Map()
    },
    state(file: DiffFile): Sig<PatchState> {
      const found = entries.get(file.path)
      if (found) return found.state
      const entry: Entry = { file, state: sig(idle), near: false, stale: false, ticket: 0 }
      entries.set(file.path, entry)
      return entry.state
    },
    files(files: DiffFile[]) {
      const kept = new Map<string, Entry>()
      for (const file of files) {
        const entry = entries.get(file.path)
        if (!entry) continue
        entry.file = file
        kept.set(file.path, entry)
      }
      for (const [path, entry] of entries) if (!kept.has(path)) entry.ticket++
      entries = kept
    },
    seen(path: string, near: boolean) {
      const entry = entries.get(path)
      if (!entry || entry.file.binary) return
      entry.near = near
      if (near && (entry.state.get().kind === 'idle' || entry.stale)) void load(entry)
    },
    retry(path: string) {
      const entry = entries.get(path)
      if (entry) void load(entry)
    },
    invalidate(paths: Iterable<string>) {
      for (const path of paths) {
        const entry = entries.get(path)
        if (entry) refresh(entry)
      }
    },
    invalidateAll() {
      for (const entry of entries.values()) refresh(entry)
    },
  }
}

export type PatchStore = ReturnType<typeof patchStore>
