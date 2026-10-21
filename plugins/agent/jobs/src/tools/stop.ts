import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import type { Store } from '../store'
import { group } from './line'

const input = z.object({ job: z.string().describe('Job id') })

export const stopTool = (store: Store): Tool<typeof input> => ({
  name: 'job_stop',
  description: 'Stop a background agent. No notice comes back for it.',
  group,
  input,
  run({ job }, { session }) {
    const entry = store.own(session, job)
    if (entry.job.status !== 'running') return `${job} already ${entry.job.status}.`
    store.stop(entry.job)
    return `Stopped ${job}.`
  },
})
