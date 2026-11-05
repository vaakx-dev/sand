import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import type { OrchestratorContext } from '../context'
import { readLimit, threadViews } from '../contract'
import { findThread } from '../find'
import { readThread } from '../read'
import { group } from './group'

const input = z.object({
  thread: z.string().describe('The thread id'),
  after: z.number().int().min(0).optional().describe('Return the items after this seq, oldest first; leave it out for the latest items'),
  limit: z.number().int().min(1).max(readLimit).optional().describe('At most this many items (default 50)'),
  view: z.enum(threadViews).optional().describe('messages: what was said (default); activity: also the tool calls and their results'),
})

export const readTool = (ctx: OrchestratorContext): Tool<typeof input> => ({
  name: 'threads_read',
  description: 'Read what another thread said; each item has a seq to read on from',
  group,
  input,
  run: ({ thread, ...options }) => JSON.stringify(readThread(findThread(ctx, thread), options)),
})
