import type { Session, ToolCallBlock } from '@sand/chats/contract'
import { toolStart } from '@sand/turns-contract/contract'
import { joinDisposers, oneLine } from '@sand/util'
import type { JobsContext } from '../context'
import { jobEnd, jobNote, type Job } from '../contract'
import type { Entry } from '../store'

const flushEvery = 1_000
const labelLength = 40
const detailLength = 60

const isCall = (block: { type: string }): block is ToolCallBlock => block.type === 'tool_call'

const callText = ({ name, input }: ToolCallBlock) => {
  const detail = input && typeof input === 'object' ? Object.values(input).find(value => typeof value === 'string') : undefined
  return detail ? `${name} ${oneLine(detail, detailLength)}` : name
}

const agentText = (ctx: JobsContext, session: Session, call: ToolCallBlock | undefined) => {
  const step = ctx.turns.current(session)?.step
  return [step === undefined ? 'between turns' : `step ${step}`, ...(call ? [callText(call)] : [])].join(' · ')
}

const isChild = (job: Job, session: Session) => job.kind === 'agent' && job.parent === session.parent && job.origin === session.origin

export const showProgress = (ctx: JobsContext, entries: Entry[], progress: (text: string) => void) => {
  const changed = new Map<Job, string>()
  let timer: Timer | undefined

  const line = (job: Job, activity: string) => {
    const done = entries.filter(entry => entry.job.status !== 'running').length
    return `${done}/${entries.length} done · ${oneLine(job.label, labelLength)} · ${activity}`
  }
  const flush = () => {
    timer = undefined
    progress([...changed].map(([job, activity]) => line(job, activity)).join('\n'))
    changed.clear()
  }
  const update = (job: Job, activity: string) => {
    changed.set(job, activity)
    timer ??= setTimeout(flush, flushEvery)
  }
  const find = (match: (job: Job) => boolean) => entries.find(({ job }) => match(job))?.job

  const child = (job: Job) => {
    const summary = ctx.sessions.children(job.parent).find(found => found.origin === job.origin)
    return summary && ctx.sessions.open(summary.id)
  }
  const now = (job: Job) => {
    if (job.kind === 'command') return job.note ?? 'running'
    const session = child(job)
    return session ? agentText(ctx, session, session.messages().flatMap(message => message.content).findLast(isCall)) : 'starting'
  }

  for (const { job } of entries) if (job.status === 'running') changed.set(job, now(job))
  if (changed.size) flush()

  return joinDisposers(
    ctx.on(toolStart, (call, session) => {
      const job = find(candidate => isChild(candidate, session))
      if (job) update(job, agentText(ctx, session, call))
    }),
    ctx.on(jobNote, ({ id, text }) => {
      const job = find(candidate => candidate.id === id)
      if (job) update(job, text)
    }),
    ctx.on(jobEnd, ended => {
      if (find(candidate => candidate === ended)) update(ended, ended.status)
    }),
    () => clearTimeout(timer),
  )
}
