import type { Missed, Schedule, Schedules, When } from '@sand/schedules/contract'
import { z } from 'zod'
import type { Routine } from './contract'

export const owner = 'routines'

const content = z.object({ name: z.string(), instructions: z.string() })

export interface NewRoutine {
  name: string
  instructions: string
  when: When
  missed?: Missed
}

export const routineOf = (schedule: Schedule): Routine => {
  const { id, subject, when, missed, paused, next, last } = schedule
  return { id, bot: subject, ...content.parse(schedule.data), when, missed, paused, ...(next !== undefined && { next }), ...(last && { last }) }
}

export const createRoutines = (schedules: Schedules) => {
  const known = (id: string, bot?: string) => {
    const schedule = schedules.get(id)
    if (!schedule || schedule.owner !== owner || (bot !== undefined && schedule.subject !== bot)) throw new Error(`No routine ${id}`)
    return schedule
  }

  return {
    list: (bot: string) => schedules.list(owner, bot).map(routineOf),
    create: (bot: string, { name, instructions, ...timing }: NewRoutine) => routineOf(schedules.create({ owner, subject: bot, ...timing, data: { name, instructions } })),
    pause: (id: string, paused: boolean, bot?: string) => routineOf(schedules.pause(known(id, bot).id, paused)),
    remove: (id: string, bot?: string) => schedules.remove(known(id, bot).id),
    forget(bot: string) {
      for (const schedule of schedules.list(owner, bot)) schedules.remove(schedule.id)
    },
  }
}

export type Routines = ReturnType<typeof createRoutines>
