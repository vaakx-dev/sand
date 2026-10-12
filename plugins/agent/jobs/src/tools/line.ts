import type { Context } from 'drydock'
import type { Job } from '../contract'

export const group = 'jobs'

const threads = (ctx: Context<'sessions'>, job: Job) =>
  job.origin ? ctx.sessions.children(job.parent).flatMap(child => (child.origin === job.origin ? [child.id] : [])) : []

export const jobLine = (ctx: Context<'sessions'>, job: Job) => {
  const children = threads(ctx, job)
  return [
    job.id,
    job.kind,
    job.status,
    job.label,
    ...(job.note ? [`note: ${job.note}`] : []),
    ...(children.length ? [`threads: ${children.join(', ')}`] : []),
  ].join(' · ')
}
