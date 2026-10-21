import { jobs, jobsChange, type JobState } from '@sand/jobs/contract'
import { owned, pulse } from '@sand/web-client/reactive'
import { effect, onInterval, sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'

const refresh = 5000

const snapshot = (list: JobState[]) =>
  list
    .filter(job => job.origin)
    .map(job => `${job.origin}:${job.status}`)
    .join('|')

export const jobWatch = (ctx: Context) => {
  const changes = pulse(ctx, [jobsChange], [jobs])
  const tick = sig(0)
  const all = () => ctx.get(jobs)?.list() ?? []
  const seen = owned(ctx, () => {
    const running = changes.read(() => all().some(job => job.origin && job.status === 'running'))
    effect(() => {
      if (running.get()) onInterval(() => tick.update(value => value + 1), refresh)
    })
    return changes.read(() => snapshot(all()))
  })

  return {
    tick: () => tick.get(),
    of(call: string) {
      seen.get()
      return all().find(job => job.origin === call)
    },
    find: (id: string) => all().find(job => job.id === id),
    cancel: (id: string) => ctx.get(jobs)?.cancel(id),
  }
}

export type JobWatch = ReturnType<typeof jobWatch>
