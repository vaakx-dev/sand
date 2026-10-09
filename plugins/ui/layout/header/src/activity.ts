import type { Context } from 'drydock'

export const agentsWorking = (ctx: Context) =>
  Boolean(ctx.jobs?.list().some(job => job.status === 'running') || ctx.threads?.list().some(thread => thread.info.kind === 'agent' && thread.running))
