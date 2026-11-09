import type { Sessions } from '@sand/chats/contract'
import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import type { Store } from '../store'
import { group, jobLine } from './line'

const input = z.object({})

const before = "Some earlier jobs may be missing; find their results in this thread's earlier messages."

export const listTool = (sessions: Sessions, store: Store, started: number): Tool<typeof input> => ({
  name: 'jobs',
  description: 'List the background commands this thread started: id, status, label and latest note, its last output line.',
  group,
  input,
  effect: 'read',
  needs: ['thread'],
  run(_input, { conversation }) {
    const jobs = store.list(conversation.id)
    const lines = jobs.length ? jobs.map(jobLine) : ['No background commands in this thread.']
    return [...lines, ...(sessions.require(conversation.id).created < started ? [before] : [])].join('\n')
  },
})
