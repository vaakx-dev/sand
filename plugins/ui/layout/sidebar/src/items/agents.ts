import { jobs } from '@sand/jobs/contract'
import type { Thread, Threads } from '@sand/web-client/contract'
import type { Context } from 'drydock'
import { visibleAncestor } from './ancestor'
import type { AgentsOf } from './items'

interface Run {
  owner?: string
  started: number
}

const looseAgents = (threads: Threads, jobOrigins: Set<string>) =>
  threads.list().filter(thread => thread.info.kind === 'agent' && thread.running && !(thread.info.origin && jobOrigins.has(thread.info.origin)))

const runningRuns = (ctx: Context, threads: Threads): Run[] => {
  const running = (ctx.get(jobs)?.list() ?? []).filter(job => job.kind === 'agent' && job.status === 'running')
  const origins = new Set(running.flatMap(job => job.origin ?? []))
  const ownerOf = (thread: Thread | undefined) => visibleAncestor(threads, thread)?.id
  return [
    ...running.map(job => ({ owner: ownerOf(threads.get(job.parent)) ?? job.parent, started: job.started })),
    ...looseAgents(threads, origins).map(thread => ({ owner: ownerOf(thread), started: thread.started ?? thread.info.created })),
  ]
}

export const runningAgents = (ctx: Context, threads: Threads): AgentsOf => {
  const byOwner = new Map<string, number[]>()
  for (const { owner, started } of runningRuns(ctx, threads)) if (owner) byOwner.set(owner, [...(byOwner.get(owner) ?? []), started])
  return thread => {
    const starts = byOwner.get(thread) ?? []
    return { agents: starts.length, since: starts.length ? Math.min(...starts) : undefined }
  }
}
