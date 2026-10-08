import { pulse } from '@sand/dom'
import type { Context } from 'drydock'

export const createWorking = (ctx: Context<'threads'>) => {
  const changes = pulse(ctx, ['jobs.change', 'thread.select', 'thread.change'], ['jobs', 'panels'])
  return {
    count: changes.read(() => {
      const thread = ctx.threads.current()
      if (!thread || thread.running) return 0
      return ctx.jobs?.list(thread.id).filter(job => job.status === 'running').length ?? 0
    }),
    clickable: changes.read(() => Boolean(ctx.panels)),
    open: () => ctx.panels?.show('agents'),
  }
}

export type Working = ReturnType<typeof createWorking>
