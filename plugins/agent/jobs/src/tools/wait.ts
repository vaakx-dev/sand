import { clipResult, type Session } from '@sand/chats/contract'
import type { Tool } from '@sand/tools/contract'
import { turnPending } from '@sand/turns-contract/contract'
import { duration } from '@sand/util'
import { z } from 'zod'
import type { JobsContext } from '../context'
import { jobEnd, jobOutput } from '../contract'
import type { Delivery } from '../deliver'
import type { Entry, Store } from '../store'
import { group, jobLine } from './line'
import { showProgress } from './progress'

const defaultTimeout = 600_000
const maxTimeout = 1_800_000
const settleGrace = 30_000
const matchWindow = 1_000
const matchedTail = 2_000

const input = z.object({
  jobs: z.array(z.string()).min(1).describe('Job ids to wait for'),
  any: z.boolean().optional().describe('Return as soon as any one of them finishes instead of waiting for all, so you can review each result as it lands; then wait again on the rest'),
  until: z
    .string()
    .optional()
    .describe("A case-insensitive regex for their output, like 'listening on|ready'. Returns as soon as their output matches it or one of them exits"),
  timeout_ms: z.number().int().positive().max(maxTimeout).optional().describe(`Give up waiting after this long (default ${defaultTimeout}, max ${maxTimeout})`),
})

interface Wait {
  entries: Entry[]
  early: boolean
  pattern?: RegExp
}

const userSpoke = 'The user sent a message; running jobs keep running.'

const endReason = ({ entries, early }: Wait) => {
  const ended = entries.filter(({ job }) => job.status !== 'running')
  if (ended.length === entries.length) return 'All finished.'
  if (early && ended.length) return `${ended.map(({ job }) => job.id).join(', ')} finished; the others keep running.`
}

const settle = (ctx: JobsContext, wait: Wait, session: Session, timeout: number, signal: AbortSignal) =>
  new Promise<string>(resolve => {
    const { entries, pattern } = wait
    const spoke = () => ctx.turns.pending(session).some(item => item.kind === 'steer' && item.origin === 'user')
    const matches = ({ job, spec }: Entry, length: number) => !!pattern && job.status === 'running' && pattern.test(Bun.stripANSI(spec.output(length)))
    const matched = ({ job }: Entry) => `${job.id} output matched; it keeps running.`
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
        const reason = endReason(wait)
        if (reason) finish(reason)
      }),
      ctx.on(jobOutput, (id, text) => {
        const entry = entries.find(({ job }) => job.id === id)
        if (entry && matches(entry, text.length + matchWindow)) finish(matched(entry))
      }),
      ctx.on(turnPending, changed => {
        if (changed.id === session.id && spoke()) finish(userSpoke)
      }),
    ]
    signal.addEventListener('abort', abort, { once: true })
    const ended = endReason(wait)
    const ready = entries.find(entry => matches(entry, Infinity))
    if (ended) finish(ended)
    else if (ready) finish(matched(ready))
    else if (spoke()) finish(userSpoke)
  })

export const waitTool = (ctx: JobsContext, store: Store, delivery: Delivery): Tool<typeof input> => ({
  name: 'job_wait',
  description:
    "Wait for background commands to finish and get their exit code and last output. Set any to return at the first finished one, then wait again on the rest. Set until to a regex to return the moment a background command's output matches it, like 'listening on|ready' right after starting a server with run_background, instead of sleeping and polling. Returns early on timeout or when the user sends a message; jobs keep running then. Jobs whose results it returns send no <task-notification>.",
  group,
  input,
  effect: 'read',
  timeoutMs: maxTimeout + settleGrace,
  needs: ['thread'],
  async run({ jobs, any = false, until, timeout_ms = defaultTimeout }, { conversation, signal, progress }) {
    const session = ctx.sessions.require(conversation.id)
    const entries = jobs.map(id => store.own(session.id, id))
    const pattern = until === undefined ? undefined : new RegExp(until, 'i')
    const stopProgress = showProgress(ctx, entries, progress)
    const reason = await settle(ctx, { entries, early: any || !!pattern, pattern }, session, timeout_ms, signal)
    stopProgress()
    signal.throwIfAborted()
    const reports = entries.map(({ job, spec, output }) => {
      if (job.status !== 'running') {
        delivery.withdraw(job.id)
        return `${jobLine(job)}\n${clipResult(output ?? '')}`
      }
      if (pattern) return `${jobLine(job)}\n${spec.output(matchedTail)}`
      return jobLine(job)
    })
    return [reason, ...reports].join('\n\n')
  },
})
