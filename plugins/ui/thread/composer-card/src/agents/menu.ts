import { copyWithNotice, errorMessage, type MenuSpec, type NavAction } from '@sand/dom'
import type { AgentRun } from '@sand/web-client/contract'
import type { Context } from 'drydock'

type Ctx = Context<'threads' | 'turns'>

const stopper = (ctx: Ctx, run: AgentRun) => {
  if (run.job && ctx.jobs) {
    const { jobs } = ctx
    const job = run.job
    return () => jobs.cancel(job)
  }
  const session = run.session
  return session ? () => ctx.turns.interrupt(session) : undefined
}

export const runMenu = (ctx: Ctx, open: () => void, run: AgentRun): MenuSpec => {
  const stop = stopper(ctx, run)
  const actions: NavAction[] = [
    ...(ctx.panels ? [{ id: 'open', label: 'Open agents panel', icon: 'bot', group: 'open', tile: true, run: open } satisfies NavAction] : []),
    ...(stop
      ? [
          {
            id: 'stop',
            label: 'Stop',
            icon: 'stop',
            group: 'stop',
            danger: true,
            tile: true,
            run: () => void stop().catch(error => ctx.notify?.push(`Could not stop: ${errorMessage(error)}`, { level: 'error' })),
          } satisfies NavAction,
        ]
      : []),
    { id: 'copy-title', label: 'Copy title', icon: 'copy', group: 'copy', run: () => copyWithNotice(ctx.notify, run.title, 'title') },
  ]
  return { title: run.title, subtitle: run.kind === 'workflow' ? 'Workflow' : 'Agent', actions }
}
