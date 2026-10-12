import type { Tool } from '@sand/tools/contract'
import type { Context } from 'drydock'
import { z } from 'zod'
import type { Store } from '../store'
import { group, jobLine } from './line'

const input = z.object({})

const before = "Jobs from before sand last restarted aren't listed; their results are in this thread's earlier messages."

export const listTool = (ctx: Context<'sessions'>, store: Store, started: number): Tool<typeof input> => ({
  name: 'jobs',
  description: 'List the background agents, workflows and shell commands this thread started: id, kind, status, label, latest note and child thread ids.',
  group,
  input,
  run(_input, { session }) {
    const jobs = store.list(session)
    const lines = jobs.length ? jobs.map(job => jobLine(ctx, job)) : ['No background jobs in this thread.']
    return [...lines, ...(session.created < started ? [before] : [])].join('\n')
  },
})
