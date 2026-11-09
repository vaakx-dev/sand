import type { Threads } from '@sand/web-client/contract'
import { visibleAncestor } from './ancestor'

export type AgentsOf = (thread: string) => { agents: number; since?: number }

export const runningAgents = (threads: Threads): AgentsOf => {
  const byOwner = new Map<string, number[]>()
  for (const thread of threads.list()) {
    if (thread.info.kind !== 'agent' || !thread.running) continue
    const owner = visibleAncestor(threads, thread)?.id
    if (owner) byOwner.set(owner, [...(byOwner.get(owner) ?? []), thread.started ?? thread.info.created])
  }
  return thread => {
    const starts = byOwner.get(thread) ?? []
    return { agents: starts.length, since: starts.length ? Math.min(...starts) : undefined }
  }
}
