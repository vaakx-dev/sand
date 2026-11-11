import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import type { Routines } from '../routines'

export const pauseTool = (routines: Routines): Tool => ({
  name: 'routine_pause',
  description: 'Pause one of your reminders or routines so it stops running, or resume it with paused false.',
  needs: ['routines'],
  input: z.object({ id: z.string().describe('The routine id from routine_list'), paused: z.boolean() }),
  effect: 'write',
  run({ id, paused }: { id: string; paused: boolean }, { conversation }) {
    const routine = routines.pause(id, paused, conversation.id)
    return `${paused ? 'Paused' : 'Resumed'} "${routine.name}"`
  },
})
