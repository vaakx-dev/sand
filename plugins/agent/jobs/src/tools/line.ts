import type { Sessions } from '@sand/chats/contract'
import type { Job } from '../contract'

export const group = 'jobs'

const threads = (sessions: Sessions, job: Job) =>
  job.origin ? sessions.children(job.parent).flatMap(child => (child.origin === job.origin ? [child.id] : [])) : []

export const jobLine = (sessions: Sessions, job: Job) => {
  const children = threads(sessions, job)
  return [
    job.id,
    job.kind,
    job.status,
    job.label,
    ...(job.note ? [`note: ${job.note}`] : []),
    ...(children.length ? [`threads: ${children.join(', ')}`] : []),
  ].join(' · ')
}
