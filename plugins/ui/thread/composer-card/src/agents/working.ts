import { derive, pulse } from '@sand/dom'
import type { Context } from 'drydock'

const shownLimit = 2

export const createWorking = (ctx: Context<'threads'>) => {
  const changes = pulse(ctx, ['jobs.change', 'threads.change', 'thread.select', 'thread.change'], ['jobs', 'panels'])
  const runs = changes.read(() => {
    const thread = ctx.threads.current()
    return thread ? (ctx.jobs?.runs(thread.id).filter(run => run.status === 'running') ?? []) : []
  })
  return {
    runs,
    shown: derive(() => runs.get().slice(0, shownLimit)),
    more: derive(() => Math.max(0, runs.get().length - shownLimit)),
    clickable: changes.read(() => Boolean(ctx.panels)),
    open: () => ctx.panels?.show('agents'),
  }
}

export type Working = ReturnType<typeof createWorking>
