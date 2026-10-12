import type { Session } from '@sand/sessions-sqlite/contract'
import type { Job, JobSpec, JobStatus, JobWork } from './contract'
import { errorMessage, untilAborted } from '@sand/kit'
import type { Context } from 'drydock'
import type { Delivery } from './deliver'
import { notification } from './notice'

const restarted = 'Stopped because sand restarted. Start it again if you still need it.'

const keptFinished = 100

export interface Entry {
  job: Job
  spec: JobSpec
  output?: string
}

export const createStore = (ctx: Context<'loop'>, delivery: Delivery) => {
  const entries = new Map<string, Entry>()
  const silenced = new Set<string>()
  const waiting = new Set<{ parent: string; resolve: () => void }>()
  const busy = (parent: string) => [...entries.values()].some(({ job }) => job.parent === parent && job.status === 'running' && job.kind !== 'shell')
  const wake = () => {
    for (const waiter of waiting) {
      if (busy(waiter.parent)) continue
      waiting.delete(waiter)
      waiter.resolve()
    }
  }
  const stop = (job: Job) => {
    if (job.status !== 'running') return
    silenced.add(job.id)
    job.cancel()
  }

  const stopForRestart = (stopped: Entry[]) => {
    for (const { job } of stopped) stop(job)
    for (const { job, spec } of stopped) delivery.record(spec.parent, notification({ ...job, status: 'cancelled' }, restarted))
  }

  const running = () => [...entries.values()].filter(({ job }) => job.status === 'running')

  let disposing = false
  ctx.effect(() => () => {
    disposing = true
    stopForRestart(running())
  })

  ctx.on('runtime.drain', () => stopForRestart(running().filter(({ job }) => job.kind === 'shell')))

  ctx.on('turn.end', (session, result) => {
    if (session.kind !== 'agent') return
    const interrupted = result.stopReason === 'interrupted'
    for (const { job } of entries.values()) if (job.parent === session.id && (interrupted || job.kind === 'shell')) stop(job)
  })

  const prune = () => {
    const finished = [...entries.values()].filter(({ job }) => job.status !== 'running').sort((a, b) => (a.job.ended ?? 0) - (b.job.ended ?? 0))
    for (const { job } of finished.slice(0, -keptFinished)) entries.delete(job.id)
  }

  ctx.on('job.note', ({ id, text }) => {
    const entry = entries.get(id)
    if (entry) entry.job.note = text
  })

  const deliver = (job: Job, parent: Session, output: string) => {
    const text = notification(job, output)
    if (job.status === 'cancelled' && !ctx.loop.active(parent)) delivery.record(parent, text)
    else delivery.post(job.id, parent, text)
  }

  const launch = (entry: Entry, work: JobWork) => {
    const { job, spec } = entry
    const controller = new AbortController()
    const release = ctx.busy()
    job.status = 'running'
    job.cancel = () => controller.abort()
    delete job.ended
    delete entry.output
    ctx.emit('job.start', job)
    const finish = (status: JobStatus, output: string) => {
      job.status = status
      job.ended = Date.now()
      entry.output = output
      release()
      ctx.emit('job.end', job, output)
      wake()
      prune()
      if (!silenced.delete(job.id) && !disposing) deliver(job, spec.parent, output)
    }
    untilAborted(work(controller.signal, job), controller.signal)
      .then(
        output => finish(controller.signal.aborted ? 'cancelled' : 'done', output),
        error => finish(controller.signal.aborted ? 'cancelled' : 'failed', errorMessage(error)),
      )
      .catch(error => ctx.ui?.notify(`Background job ${job.id} ended, but its result was not delivered: ${errorMessage(error)}`, 'error'))
  }

  const start = (spec: JobSpec) => {
    const job: Job = {
      id: `job_${Bun.randomUUIDv7().slice(-8)}`,
      kind: spec.kind,
      label: spec.label,
      parent: spec.parent.id,
      ...(spec.origin && { origin: spec.origin }),
      status: 'running',
      started: Date.now(),
      cancel: () => {},
    }
    const entry: Entry = { job, spec }
    entries.set(job.id, entry)
    launch(entry, spec.work)
    return job
  }

  const resume = (job: Job, work: JobWork) => {
    const entry = entries.get(job.id)
    if (!entry) throw new Error(`Unknown job ${job.id}`)
    if (job.status === 'running') throw new Error(`${job.id} is still running`)
    launch(entry, work)
  }

  const idle = (parent: Session, signal: AbortSignal) =>
    new Promise<void>(resolve => {
      if (!busy(parent.id) || signal.aborted) return resolve()
      const waiter = { parent: parent.id, resolve }
      waiting.add(waiter)
      signal.addEventListener('abort', () => waiting.delete(waiter) && resolve(), { once: true })
    })

  const list = (parent?: Session) => [...entries.values()].map(({ job }) => job).filter(job => !parent || job.parent === parent.id)

  const own = (session: Session, id: string) => {
    const entry = entries.get(id)
    if (!entry || entry.job.parent !== session.id) throw new Error(`No job ${id} in this thread. Call jobs to list yours.`)
    return entry
  }

  return { start, resume, idle, list, own, stop }
}

export type Store = ReturnType<typeof createStore>
