import type { Job } from '../contract'

export const group = 'jobs'

export const jobLine = (job: Job) => [job.id, job.status, job.label, ...(job.note ? [`note: ${job.note}`] : [])].join(' · ')
