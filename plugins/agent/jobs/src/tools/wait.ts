import type { Session } from '@sand/chats/contract'
import type { Tool } from '@sand/tools/contract'
import { turnPending } from '@sand/turns-contract/contract'
import { duration } from '@sand/util'
import { z } from 'zod'
import type { JobsContext } from '../context'
import { jobEnd } from '../contract'
import type { Delivery } from '../deliver'
import { clip } from '../notice'
import type { Entry, Store } from '../store'
import { group, jobLine } from './line'

const defaultTimeout = 600_000
const maxTimeout = 1_800_000
const settleGrace = 30_000

const input = z.object({
  jobs: z.array(z.string()).min(1).describe('Job ids to wait for'),
  timeout_ms: z.number().int().positive().max(maxTimeout).optional().describe(`Give up waiting after this long (default ${defaultTimeout}, max ${maxTimeout})`),
})

const allDone = 'All finished.'
const userSpoke = 'The user sent a message; running jobs keep running.'

const finished = (entries: Entry[]) => entries.every(({ job }) => job.status !== 'running')

const settle = (ctx: JobsContext, entries: Entry[], session: Session, timeout: number, signal: AbortSignal) =>
  new Promise<string>(resolve => {
    const spoke = () => ctx.turns.pending(session).some(item => item.kind === 'steer' && item.origin === 'user')
    const finish = (reason: string) => {
      clearTimeout(timer)
      for (const stop of stops) void stop()
      signal.removeEventListener('abort', abort)
      resolve(reason)
    }
    const abort = () => finish('Interrupted.')
    const timer = setTimeout(() => finish(`Timed out after ${duration(timeout)}; running jobs keep running.`), timeout)
    const stops = [
      ctx.on(jobEnd, () => {
        if (finished(entries)) finish(allDone)
      }),
      ctx.on(turnPending, changed => {
        if (changed.id === session.id && spoke()) finish(userSpoke)
      }),
    ]
    signal.addEventListener('abort', abort, { once: true })
    if (finished(entries)) finish(allDone)
    else if (spoke()) finish(userSpoke)
  })

export const waitTool = (ctx: JobsContext, store: Store, delivery: Delivery): Tool<typeof input> => ({
  name: 'job_wait',
  description:
    "Wait for background jobs to finish and get their results: an agent's report, or a command's exit code and last output. Returns early on timeout or when the user sends a message; jobs keep running then. Jobs whose results it returns send no <task-notification>.",
  group,
  input,
  effect: 'read',
  timeoutMs: maxTimeout + settleGrace,
  needs: ['thread'],
  async run({ jobs, timeout_ms = defaultTimeout }, { conversation, signal }) {
    const session = ctx.sessions.require(conversation.id)
    const entries = jobs.map(id => store.own(session.id, id))
    const reason = await settle(ctx, entries, session, timeout_ms, signal)
    signal.throwIfAborted()
    const reports = entries.map(({ job, output }) => {
      if (job.status === 'running') return jobLine(ctx.sessions, job)
      delivery.withdraw(job.id)
      return `${jobLine(ctx.sessions, job)}\n${clip(output ?? '')}`
    })
    return [reason, ...reports].join('\n\n')
  },
})
