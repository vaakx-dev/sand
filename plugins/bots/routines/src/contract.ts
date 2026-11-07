import { request, type, wireEvent } from '@sand/host-hub/contract'
import type { LastRun, Missed, When } from '@sand/schedules/contract'
import { z } from 'zod'

export interface Routine {
  id: string
  bot: string
  name: string
  instructions: string
  when: When
  missed: Missed
  paused: boolean
  next?: number
  last?: LastRun
}

export const routinesChangeWire = wireEvent<[bot: string, routines: Routine[]]>('routines.change')

const one = z.object({ routine: z.string() })

export const routineList = request('routine.list', { input: z.object({ bot: z.string() }), output: type<Routine[]>() })
export const routinePause = request('routine.pause', { input: one.extend({ paused: z.boolean() }), output: type<Routine>() })
export const routineDelete = request('routine.delete', { input: one, output: type<boolean>() })
