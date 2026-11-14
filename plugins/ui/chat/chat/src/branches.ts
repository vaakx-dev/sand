import type { Branch } from '@sand/chats/contract'
import type { Thread } from '@sand/web-client/contract'
import { sig, untrack } from '@vaakx-dev/vrui'

interface Round {
  head: string | null
  asked: boolean
}

const grew = (thread: Thread, from: string | null) => {
  if (!from) return false
  for (let at = thread.info.head; at; at = thread.entries.get(at)?.parent ?? null) if (at === from) return true
  return false
}

export type BranchLists = ReturnType<typeof branchLists>

export const branchLists = (fetch: () => Promise<Branch[][]>) => {
  const lists = sig(new Map<string, Branch[]>())
  const round = sig<Round | undefined>(undefined)
  const running = sig(false)

  const keep = (asked: Round, forks: Branch[][]) => {
    if (untrack(() => round.get()) !== asked) return
    lists.set(new Map(forks.flatMap(fork => fork.map(branch => [branch.entry, fork] as const))))
  }

  return {
    running,
    of: (entry: string) => lists.get().get(entry) ?? [],
    follow(thread: Thread) {
      running.set(thread.running)
      const now = untrack(() => round.get())
      if (thread.loaded && now && (thread.running || now.head === thread.info.head)) return
      if (thread.loaded && now && grew(thread, now.head)) {
        now.head = thread.info.head
        return
      }
      round.set(thread.loaded ? { head: thread.info.head, asked: false } : undefined)
    },
    want() {
      const now = round.get()
      if (!now || now.asked) return
      now.asked = true
      fetch().then(
        forks => keep(now, forks),
        () => {
          now.asked = false
        },
      )
    },
  }
}
