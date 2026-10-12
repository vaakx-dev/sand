import { errorMessage } from '@sand/kit'
import { copyWithNotice } from '@sand/kit/web'
import type { MenuSpec, NavAction } from '@sand/protocol'
import type { AgentRun } from '@sand/web-client/contract'
import type { Context } from 'drydock'

type Ctx = Context<'threads' | 'turns'>

const stopper = (ctx: Ctx, { job, session }: AgentRun) => {
  const { jobs } = ctx
  if (job && jobs) return () => jobs.cancel(job)
  if (session) return () => ctx.turns.interrupt(session)
  return undefined
}

const openAction = (open: () => void): NavAction => ({ id: 'open', label: 'Open agents panel', icon: 'bot', group: 'open', tile: true, run: open })

const stopAction = (ctx: Ctx, stop: () => Promise<unknown>): NavAction => ({
  id: 'stop',
  label: 'Stop',
  icon: 'stop',
  group: 'stop',
  danger: true,
  tile: true,
  run: () => void stop().catch(error => ctx.notify?.push(`Could not stop: ${errorMessage(error)}`, { level: 'error' })),
})

export const runMenu = (ctx: Ctx, open: () => void, run: AgentRun): MenuSpec => {
  const stop = stopper(ctx, run)
  const actions: NavAction[] = [
    ...(ctx.panels ? [openAction(open)] : []),
    ...(stop ? [stopAction(ctx, stop)] : []),
    { id: 'copy-title', label: 'Copy title', icon: 'copy', group: 'copy', tile: true, run: () => copyWithNotice(ctx.notify, run.title, 'title') },
  ]
  return { title: run.title, subtitle: run.kind === 'workflow' ? 'Workflow' : 'Agent', actions }
}
