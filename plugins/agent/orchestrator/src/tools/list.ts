import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import type { OrchestratorContext } from '../context'
import { readLimit } from '../contract'
import { listThreads } from '../list'
import { group } from './group'

const input = z.object({
  cwd: z.string().optional().describe('Only threads in this folder'),
  project: z.string().optional().describe('Only threads in this project'),
  limit: z.number().int().min(1).max(readLimit).optional().describe('At most this many, newest first (default 50)'),
})

export const listTool = (ctx: OrchestratorContext): Tool<typeof input> => ({
  name: 'threads_list',
  description: "List sand's threads, newest first, with each one's status",
  group,
  input,
  effect: 'read',
  run: filter => JSON.stringify(listThreads(ctx, filter)),
})
