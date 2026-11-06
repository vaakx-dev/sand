import { systemZone } from '@sand/schedules/contract'
import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import type { Routine } from '../contract'
import type { Routines } from '../routines'
import { timeIn, timing, zoneOf } from '../time'

const stateOf = (routine: Routine) => {
  if (routine.paused) return 'paused'
  return routine.next === undefined ? 'done' : `next ${timeIn(routine.next, zoneOf(routine.when))}`
}

const lastOf = ({ last }: Routine) => {
  if (!last) return ''
  return `; last ${last.outcome}${last.error ? ` (${last.error})` : ''}`
}

const lineOf = (routine: Routine) =>
  `- ${routine.id} "${routine.name}": ${timing(routine.when)}${routine.watch ? `, checking ${routine.watch.check} first` : ''}; ${stateOf(routine)}${lastOf(routine)}\n  ${routine.instructions}`

export const listTool = (routines: Routines): Tool => ({
  name: 'routine_list',
  description: 'List your reminders and routines with when they run next, and the time now.',
  needs: ['routines'],
  effect: 'read',
  input: z.object({}),
  run(_, { conversation }) {
    const now = `It is now ${timeIn(Date.now(), systemZone())} (${systemZone()}).`
    const found = routines.list(conversation.id)
    return [now, found.length ? found.map(lineOf).join('\n') : 'You have no reminders or routines.'].join('\n\n')
  },
})
