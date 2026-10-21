import type { Session } from '@sand/chats/contract'
import { steering, turnQueue } from '@sand/steering/contract'
import type { Tool } from '@sand/tools/contract'
import { duration } from '@sand/util'
import { z } from 'zod'
import type { JobsContext } from '../context'
import { jobEnd } from '../contract'
import type { Delivery } from '../deliver'
import { clip } from '../notice'
import type { Entry, Store } from '../store'
import { group, jobLine } from './line'

const defaultTimeout = 600_000

const input = z.object({
  jobs: z.array(z.string()).min(1).describe('Job ids to wait for'),
  timeout_ms: z.number().int().positive().optional().describe(`Give up waiting after this long (default ${defaultTimeout})`),
})

const allDone = 'All finished.'
const userSpoke = 'The user sent a message; running jobs keep running.'

const finished = (entries: Entry[]) => entries.every(({ job }) => job.status !== 'running')

const settle = (ctx: JobsContext, delivery: Delivery, entries: Entry[], session: Session, timeout: number, signal: AbortSignal) =>
  new Promise<string>(resolve => {
    const spoke = () => Boolean(ctx.get(steering)?.list(session).some(item => !delivery.isNotice(item.id)))
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
      ctx.on(turnQueue, queued => {
        if (queued.id === session.id) queueMicrotask(() => spoke() && finish(userSpoke))
      }),
    ]
    signal.addEventListener('abort', abort, { once: true })
    if (finished(entries)) finish(allDone)
    else if (spoke()) finish(userSpoke)
  })

export const waitTool = (ctx: JobsContext, store: Store, delivery: Delivery): Tool<typeof input> => ({
  name: 'job_wait',
  description:
    'Wait for background agents to finish and get their results. Returns early on timeout or when the user sends a message; jobs keep running then. Results returned here are not sent again as notices.',
  group,
  input,
  async run({ jobs, timeout_ms = defaultTimeout }, { session, signal }) {
    const entries = jobs.map(id => store.own(session, id))
    const reason = await settle(ctx, delivery, entries, session, timeout_ms, signal)
    signal.throwIfAborted()
    const reports = entries.map(({ job, output }) => {
      if (job.status === 'running') return jobLine(ctx.sessions, job)
      delivery.withdraw(job.id)
      return `${jobLine(ctx.sessions, job)}\n${clip(output ?? '')}`
    })
    return [reason, ...reports].join('\n\n')
  },
})
