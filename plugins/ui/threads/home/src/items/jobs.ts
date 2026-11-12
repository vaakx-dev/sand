import { jobs } from '@sand/jobs/contract'
import type { Thread, Threads } from '@sand/web-client/contract'
import type { Context } from 'drydock'
import { visibleAncestor } from './ancestor'

export type JobsOf = (thread: string) => { jobs: number; since?: number }

interface Run {
  owner?: string
  started: number
}

const runningRuns = (ctx: Context, threads: Threads): Run[] => {
  const ownerOf = (thread: Thread | undefined) => visibleAncestor(threads, thread)?.id
  const commands = (ctx.get(jobs)?.list() ?? []).filter(job => job.status === 'running')
  const subagents = threads.list().filter(thread => thread.info.kind === 'agent' && thread.turn)
  return [
    ...commands.map(job => ({ owner: ownerOf(threads.get(job.parent)) ?? job.parent, started: job.started })),
    ...subagents.map(thread => ({ owner: ownerOf(thread), started: thread.started ?? thread.info.created })),
  ]
}

export const runningJobs = (ctx: Context, threads: Threads): JobsOf => {
  const byOwner = new Map<string, number[]>()
  for (const { owner, started } of runningRuns(ctx, threads)) if (owner) byOwner.set(owner, [...(byOwner.get(owner) ?? []), started])
  return thread => {
    const starts = byOwner.get(thread) ?? []
    return { jobs: starts.length, since: starts.length ? Math.min(...starts) : undefined }
  }
}
