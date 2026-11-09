import { notificationText } from '@sand/chats/contract'
import type { Job } from './contract'

export const notification = (job: Job, output: string) =>
  notificationText({ from: 'job', id: job.id, kind: job.kind, label: job.label, status: job.status, at: job.ended ?? Date.now(), result: output })
