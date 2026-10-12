import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import type { Store } from '../store'
import { group } from './line'

const input = z.object({
  job: z.string().describe('Job id'),
  cursor: z.number().int().min(0).optional().describe('Where to start: the cursor from your last read of this job (default: the start)'),
})

export const readTool = (store: Store): Tool<typeof input> => ({
  name: 'job_read',
  description:
    "Read a background job's progress. Agent: its thread's messages. Workflow: its agents with status and latest output. Shell: output since the cursor.",
  group,
  input,
  async run({ job, cursor }, { session }) {
    const { spec } = store.own(session, job)
    if (!spec.read) throw new Error(`${job} has nothing to read`)
    return spec.read(cursor)
  },
})
