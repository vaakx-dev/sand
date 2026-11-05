import type { Branch } from '@sand/chats/contract'
import type { Thread } from '@sand/web-client/contract'
import { sig, untrack } from '@vaakx-dev/vrui'

interface Round {
  head: string | null
  fresh: Set<string>
}

export type BranchLists = ReturnType<typeof branchLists>

export const branchLists = (fetch: (entry: string) => Promise<Branch[]>) => {
  const lists = sig(new Map<string, Branch[]>())
  const round = sig<Round | undefined>(undefined)
  const running = sig(false)

  const keep = (asked: Round, found: Branch[]) => {
    if (untrack(() => round.get()) !== asked) return
    for (const branch of found) asked.fresh.add(branch.entry)
    lists.update(known => new Map([...known, ...found.map(branch => [branch.entry, found] as const)]))
  }

  return {
    running,
    of: (entry: string) => lists.get().get(entry) ?? [],
    follow(thread: Thread) {
      running.set(thread.running)
      const now = untrack(() => round.get())
      if (thread.loaded && now && (thread.running || now.head === thread.info.head)) return
      round.set(thread.loaded ? { head: thread.info.head, fresh: new Set() } : undefined)
    },
    want(entry: string) {
      const now = round.get()
      if (!now || now.fresh.has(entry)) return
      now.fresh.add(entry)
      fetch(entry).then(
        found => keep(now, found),
        () => now.fresh.delete(entry),
      )
    },
  }
}
