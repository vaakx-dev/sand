import type { ToolBadge, ToolView, ToolViews } from '../contract'
import type { Jobs, JobState } from '@sand/web-client/contract'
import { effect, errorMessage, onInterval, owned, pulse, sig, type NavAction } from '@sand/dom'
import { duration } from '@sand/kit'
import type { Context } from 'drydock'
import { resolveRenderer } from './resolve'

const refresh = 5000

const outcomes: Record<Exclude<JobState['status'], 'running'>, ToolBadge> = {
  done: { text: 'done', tone: 'success' },
  failed: { text: 'failed', tone: 'danger' },
  cancelled: { text: 'stopped', tone: 'neutral' },
}

const snapshot = (jobs?: Jobs) =>
  (jobs?.list() ?? [])
    .filter(job => job.origin)
    .map(job => `${job.origin}:${job.status}`)
    .join('|')

const anyRunning = (jobs?: Jobs) => Boolean(jobs?.list().some(job => job.origin && job.status === 'running'))

export const backgroundJobs = (ctx: Context): ToolViews['backgroundJobs'] => {
  const changes = pulse(ctx, ['jobs.change'], ['jobs'])
  const tick = sig(0)
  const seen = owned(ctx, () => {
    const running = changes.read(() => anyRunning(ctx.jobs))
    effect(() => {
      if (running.get()) onInterval(() => tick.update(value => value + 1), refresh)
    })
    return changes.read(() => snapshot(ctx.jobs))
  })

  const jobOf = (tool: ToolView) => {
    seen.get()
    return ctx.jobs?.list().find(job => job.origin === tool.call.id)
  }

  const stop = (job: JobState): NavAction => ({
    id: 'stop',
    label: 'Stop',
    icon: 'stop',
    group: 'run',
    danger: true,
    run: () => ctx.jobs?.cancel(job.id).catch(error => ctx.notify?.push(`Could not stop: ${errorMessage(error)}`, { level: 'error' })),
  })

  return (transcript, name, base) => {
    const plain = resolveRenderer(name, base)
    return transcript.tool(name, {
      ...plain,
      meta(tool) {
        tick.get()
        const job = jobOf(tool)
        return job ? `in background · ${duration((job.ended ?? Date.now()) - job.started)}` : plain.meta(tool)
      },
      badge(tool) {
        const job = jobOf(tool)
        return job && job.status !== 'running' ? outcomes[job.status] : plain.badge(tool)
      },
      actions(tool) {
        const job = jobOf(tool)
        return job?.status === 'running' ? [stop(job)] : []
      },
    })
  }
}
