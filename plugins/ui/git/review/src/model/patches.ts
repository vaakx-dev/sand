import type { DiffPatch } from '@sand/git-diff/contract'
import type { PullRef } from '@sand/github/contract'
import type { ReviewFiles } from '@sand/pull-review/contract'
import { errorMessage } from '@sand/util'
import { sig, type Sig } from '@vaakx-dev/vrui'
import type { ReviewContext } from '../inject'

export type PatchState = { kind: 'idle' } | { kind: 'loading' } | { kind: 'ready'; patch: DiffPatch } | { kind: 'error'; message: string }

interface Entry {
  state: Sig<PatchState>
  near: boolean
  stale: boolean
  ticket: number
}

interface Source {
  head: string
  commit?: string
}

const idle: PatchState = { kind: 'idle' }

export const patchStore = (ctx: ReviewContext, ref: PullRef) => {
  let source: Source | undefined
  const entries = new Map<string, Entry>()

  const load = async (path: string, entry: Entry) => {
    const goal = source
    if (!goal) return
    const mine = ++entry.ticket
    entry.stale = false
    if (entry.state.get().kind !== 'ready') entry.state.set({ kind: 'loading' })
    try {
      const patch = await ctx.review.patch({ ...ref, path, ...(goal.commit ? { commit: goal.commit } : {}) })
      if (mine === entry.ticket) entry.state.set({ kind: 'ready', patch })
    } catch (error) {
      if (mine === entry.ticket) entry.state.set({ kind: 'error', message: errorMessage(error) })
    }
  }

  const entryOf = (path: string) => {
    const found = entries.get(path)
    if (found) return found
    const entry: Entry = { state: sig(idle), near: false, stale: false, ticket: 0 }
    entries.set(path, entry)
    return entry
  }

  return {
    source(files: ReviewFiles) {
      const before = source
      source = { head: files.head, ...(files.commit ? { commit: files.commit } : {}) }
      if (before && before.head === source.head && before.commit === source.commit) return
      const otherCommit = before !== undefined && before.commit !== source.commit
      for (const [path, entry] of entries) {
        entry.ticket++
        entry.stale = true
        if (otherCommit) entry.state.set(idle)
        if (entry.near) void load(path, entry)
      }
    },
    state: (path: string) => entryOf(path).state,
    seen(path: string, near: boolean) {
      const entry = entryOf(path)
      entry.near = near
      if (near && (entry.state.get().kind === 'idle' || entry.stale)) void load(path, entry)
    },
    retry(path: string) {
      void load(path, entryOf(path))
    },
  }
}

export type PatchStore = ReturnType<typeof patchStore>
