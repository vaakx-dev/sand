import type { Job } from './contract'

const limit = 30_000

export const clip = (text: string) => (text.length > limit ? `${text.slice(0, limit)}\n… ${text.length - limit} characters truncated` : text)

export const notification = (job: Job, output: string) =>
  [
    '<task-notification>',
    `<job>${job.id}</job>`,
    `<kind>${job.kind}</kind>`,
    `<label>${job.label}</label>`,
    `<status>${job.status}</status>`,
    '<result>',
    clip(output),
    '</result>',
    '</task-notification>',
  ].join('\n')
