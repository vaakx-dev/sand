import { request, type, wireEvent } from '@sand/host-hub/contract'
import { type LastRun, type Missed, systemZone, type When } from '@sand/schedules/contract'
import { lazy } from '@sand/util'
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

const callers = 'any'

const bot = lazy(() => z.string().optional().describe('The bot it belongs to (default: you, when you are a bot)'))

const routine = lazy(() => z.string().describe('The routine id from routine_list'))

export const newRoutine = lazy(() =>
  z.object({
    bot: bot(),
    name: z.string().trim().min(1).max(60).describe('A short name the user sees, like "Call Ana"'),
    instructions: z.string().trim().min(1).describe("What to do when it comes due, written to the bot's future self"),
    at: z.string().optional().describe('For one time: the local date and time, like 2026-11-04 18:00'),
    in_minutes: z.number().int().min(1).optional().describe('For one time: how many minutes from now'),
    repeat: z.string().optional().describe('To repeat: a five-field cron schedule in local time, like "0 9 * * 1-5" for weekdays at 9:00'),
    zone: z.string().optional().describe(`The time zone for at and repeat, like Europe/Berlin. Default: ${systemZone()}`),
    if_missed: z.enum(['run', 'skip']).optional().describe('When sand was off at a due time: run once when back (default), or skip it'),
  }),
)

export type NewRoutine = z.output<ReturnType<typeof newRoutine>>

export const routineList = request('routine.list', { input: () => z.object({ bot: bot() }), output: type<Routine[]>(), callers })
export const routineCreate = request('routine.create', { input: newRoutine, output: type<Routine>(), callers })
export const routinePause = request('routine.pause', { input: () => z.object({ routine: routine(), paused: z.boolean() }), output: type<Routine>(), callers })
export const routineDelete = request('routine.delete', { input: () => z.object({ routine: routine() }), output: type<boolean>(), callers })
