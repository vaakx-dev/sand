import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import type { Store } from '../store'
import { group } from './line'

const input = z.object({
  job: z.string().describe('Job id'),
  message: z.string().describe('What to send'),
})

export const sendTool = (store: Store): Tool<typeof input> => ({
  name: 'job_send',
  description:
    'Message a background agent. Running: steer it. Finished: give it a follow-up task in the same thread; its report comes back as a new <task-notification>.',
  group,
  input,
  async run({ job, message }, { session }) {
    const entry = store.own(session, job)
    if (!entry.spec.send) throw new Error(`${entry.job.kind} jobs can't take messages`)
    return entry.spec.send(message, entry.job)
  },
})
