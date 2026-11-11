import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import type { Routines } from '../routines'

export const deleteTool = (routines: Routines): Tool => ({
  name: 'routine_delete',
  description: 'Delete one of your reminders or routines for good.',
  needs: ['routines'],
  input: z.object({ id: z.string().describe('The routine id from routine_list') }),
  effect: 'write',
  run({ id }: { id: string }, { conversation }) {
    routines.remove(id, conversation.id)
    return `Deleted ${id}`
  },
})
