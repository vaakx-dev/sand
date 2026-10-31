import type { DiffPatch } from '@sand/git-diff/contract'
import { errorMessage } from '@sand/util'
import { sig, type Sig } from '@vaakx-dev/vrui'
import type { PatchFile, PatchState, PatchStore } from '../contract'

interface Entry<F> {
  file: F
  state: Sig<PatchState>
  near: boolean
  stale: boolean
  ticket: number
}

const idle: PatchState = { kind: 'idle' }

export const patchStore = <F extends PatchFile>(load: (file: F) => Promise<DiffPatch>, loaded?: (path: string) => void): PatchStore<F> => {
  let entries = new Map<string, Entry<F>>()

  const fetch = async (entry: Entry<F>) => {
    const mine = ++entry.ticket
    entry.stale = false
    if (entry.state.get().kind !== 'ready') entry.state.set({ kind: 'loading' })
    try {
      const patch = await load(entry.file)
      if (mine !== entry.ticket) return
      entry.state.set({ kind: 'ready', patch })
      loaded?.(entry.file.path)
    } catch (error) {
      if (mine === entry.ticket) entry.state.set({ kind: 'error', message: errorMessage(error) })
    }
  }

  const reload = (entry: Entry<F>) => {
    if (entry.state.get().kind === 'idle') return
    entry.stale = true
    if (entry.near) void fetch(entry)
  }

  return {
    state(file) {
      const found = entries.get(file.path)
      if (found) return found.state
      const entry: Entry<F> = { file, state: sig(idle), near: false, stale: false, ticket: 0 }
      entries.set(file.path, entry)
      return entry.state
    },
    files(files) {
      const kept = new Map<string, Entry<F>>()
      for (const file of files) {
        const entry = entries.get(file.path)
        if (!entry) continue
        entry.file = file
        kept.set(file.path, entry)
      }
      for (const [path, entry] of entries) if (!kept.has(path)) entry.ticket++
      entries = kept
    },
    seen(path, near) {
      const entry = entries.get(path)
      if (!entry || entry.file.binary) return
      entry.near = near
      if (near && (entry.state.get().kind === 'idle' || entry.stale)) void fetch(entry)
    },
    retry(path) {
      const entry = entries.get(path)
      if (entry) void fetch(entry)
    },
    stale(paths) {
      const chosen = paths ? [...paths].flatMap(path => entries.get(path) ?? []) : [...entries.values()]
      for (const entry of chosen) reload(entry)
    },
    reset() {
      for (const entry of entries.values()) {
        entry.ticket++
        entry.state.set(idle)
        entry.stale = false
        if (entry.near) void fetch(entry)
      }
    },
  }
}
