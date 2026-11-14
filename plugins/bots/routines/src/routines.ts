import type { Missed, Schedule, Schedules, When } from '@sand/schedules/contract'
import type { Job } from '@sand/bots/contract'
import { z } from 'zod'
import type { Routine } from './contract'

export const owner = 'routines'

const content = z.object({ name: z.string(), instructions: z.string(), job: z.string().optional() })

export interface RoutineSpec {
  name: string
  instructions: string
  job?: string
  when: When
  missed?: Missed
}

export const routineOf = (schedule: Schedule): Routine => {
  const { id, subject, when, missed, paused, next, last } = schedule
  return { id, bot: subject, ...content.parse(schedule.data), when, missed, paused, ...(next !== undefined && { next }), ...(last && { last }) }
}

export const createRoutines = (schedules: Schedules) => {
  const known = (id: string) => {
    const schedule = schedules.get(id)
    if (schedule?.owner !== owner) throw new Error(`No routine ${id}`)
    return schedule
  }

  return {
    list: (bot?: string) => schedules.list(owner, bot).map(routineOf),
    create: (bot: string, { name, instructions, job, ...timing }: RoutineSpec) =>
      routineOf(schedules.create({ owner, subject: bot, ...timing, data: { name, instructions, ...(job && { job }) } })),
    pause: (id: string, paused: boolean) => routineOf(schedules.pause(known(id).id, paused)),
    retry: (id: string) => routineOf(schedules.retry(known(id).id)),
    remove: (id: string) => schedules.remove(known(id).id),
    forget(bot: string) {
      for (const schedule of schedules.list(owner, bot)) schedules.remove(schedule.id)
    },
    forgetJob({ id, bot }: Pick<Job, 'id' | 'bot'>) {
      for (const schedule of schedules.list(owner, bot)) if (routineOf(schedule).job === id) schedules.remove(schedule.id)
    },
  }
}

export type Routines = ReturnType<typeof createRoutines>
