import type { Sessions } from '@sand/chats/contract'
import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import type { Store } from '../store'
import { group, jobLine } from './line'

const input = z.object({})

const before = "Jobs from before sand last restarted aren't listed; their results are in this thread's earlier messages."

export const listTool = (sessions: Sessions, store: Store, started: number): Tool<typeof input> => ({
  name: 'jobs',
  description: 'List the background agents this thread started: id, kind, status, label, latest note and child thread ids.',
  group,
  input,
  run(_input, { session }) {
    const jobs = store.list(session)
    const lines = jobs.length ? jobs.map(job => jobLine(sessions, job)) : ['No background jobs in this thread.']
    return [...lines, ...(session.created < started ? [before] : [])].join('\n')
  },
})
