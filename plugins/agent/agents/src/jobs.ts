import type { Session } from '@sand/sessions-sqlite/contract'
import type { Job, JobStatus } from './contract'
import { errorMessage, untilAborted } from '@sand/kit'
import type { Context } from 'drydock'

const limit = 30_000

const notification = (job: Job, output: string) =>
  [
    '<task-notification>',
    `<job>${job.id}</job>`,
    `<label>${job.label}</label>`,
    `<status>${job.status}</status>`,
    '<result>',
    output.length > limit ? `${output.slice(0, limit)}\n… ${output.length - limit} characters truncated` : output,
    '</result>',
    '</task-notification>',
  ].join('\n')

export const createJobs = (ctx: Context<'loop'>) => {
  const jobs = new Map<string, Job>()
  const silenced = new Set<string>()
  const waiting = new Set<{ parent: string; resolve: () => void }>()
  const busy = (parent: string) => [...jobs.values()].some(job => job.parent === parent && job.status === 'running')
  const wake = () => {
    for (const waiter of waiting) {
      if (busy(waiter.parent)) continue
      waiting.delete(waiter)
      waiter.resolve()
    }
  }
  let disposing = false
  ctx.effect(() => () => {
    disposing = true
    for (const job of jobs.values()) job.cancel()
  })

  ctx.on('turn.end', (session, result) => {
    if (result.stopReason !== 'interrupted') return
    for (const job of jobs.values()) {
      if (job.parent !== session.id || job.status !== 'running') continue
      silenced.add(job.id)
      job.cancel()
    }
  })

  ctx.on('job.note', ({ id, text }) => {
    const job = jobs.get(id)
    if (job) job.note = text
  })

  const deliver = (session: Session, text: string) => {
    if (ctx.steering?.steer(session, text)) return
    ctx.loop.run(session, text).catch(error => ctx.ui?.notify(`Could not deliver a background result: ${errorMessage(error)}`, 'error'))
  }

  const start = (parent: Session, label: string, work: (signal: AbortSignal, job: Job) => Promise<string>, origin?: string) => {
    const controller = new AbortController()
    const release = ctx.busy()
    const job: Job = {
      id: `job_${Bun.randomUUIDv7().slice(-8)}`,
      label,
      parent: parent.id,
      ...(origin && { origin }),
      status: 'running',
      started: Date.now(),
      cancel: () => controller.abort(),
    }
    jobs.set(job.id, job)
    ctx.emit('job.start', job)
    const finish = (status: JobStatus, output: string) => {
      job.status = status
      job.ended = Date.now()
      release()
      ctx.emit('job.end', job, output)
      if (!disposing && !silenced.delete(job.id)) deliver(parent, notification(job, output))
      wake()
    }
    untilAborted(work(controller.signal, job), controller.signal).then(
      output => finish(controller.signal.aborted ? 'cancelled' : 'done', output),
      error => finish(controller.signal.aborted ? 'cancelled' : 'failed', errorMessage(error)),
    )
    return job
  }

  const idle = (parent: Session, signal: AbortSignal) =>
    new Promise<void>(resolve => {
      if (!busy(parent.id) || signal.aborted) return resolve()
      const waiter = { parent: parent.id, resolve }
      waiting.add(waiter)
      signal.addEventListener('abort', () => waiting.delete(waiter) && resolve(), { once: true })
    })

  return {
    start,
    idle,
    list: (parent?: Session) => [...jobs.values()].filter(job => !parent || job.parent === parent.id),
  }
}
