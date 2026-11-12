import type { Wire } from '@sand/devices-contract'
import { threadList, type ThreadRow, type ThreadStatus } from '@sand/orchestrator/contract'
import { threadFacts } from '@sand/threads-home/contract'
import type { Status, Subject } from '@sand/ui-shell/contract'
import type { Thread, Threads } from '@sand/web-client/contract'
import type { Context } from 'drydock'

export interface Listed {
  subagent: Thread
  final?: Status
}

interface FinishedParts {
  wire: Wire
  threads: Threads
  starterOf(subagent: Thread): string | undefined
}

const SHOWN = 3

const DAY_MS = 24 * 60 * 60 * 1000

const finalStatuses: Partial<Record<ThreadStatus, Status>> = { completed: 'done', failed: 'failed', lost: 'failed', interrupted: 'stopped' }

const keyOf = (device: string, starter: string) => `${device}\0${starter}`

const starterFilter = ({ owner, session }: Subject) => (owner === 'thread' ? { thread: session } : { bot: session })

export const finishedSubagents = (ctx: Context, { wire, threads, starterOf }: FinishedParts) => {
  const lists = threadFacts(ctx, threads, {
    key: subject => keyOf(subject.device, subject.session),
    device: subject => subject.device,
    touched: subagent => {
      const starter = starterOf(subagent)
      return subagent.info.kind === 'agent' && starter ? keyOf(subagent.device, starter) : undefined
    },
    load: (subject: Subject) => wire.call(threadList, { ...starterFilter(subject), subagents: true }, subject.device),
  })

  const finishedOf = (row: ThreadRow, since: number): Listed | undefined => {
    const final = finalStatuses[row.status]
    const subagent = threads.get(row.thread)
    if (!final || !subagent || subagent.running || row.updated < since) return undefined
    return { subagent, final }
  }

  return (subject: Subject) => {
    const since = Date.now() - DAY_MS
    const rows = lists.get(subject) ?? []
    return rows
      .map(row => finishedOf(row, since))
      .filter(found => found !== undefined)
      .slice(0, SHOWN)
  }
}
