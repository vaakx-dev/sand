import { event, service, type Dispose } from 'drydock'
import type { output, ZodObject } from 'zod'

export { localInstant, systemZone } from './time/zone'

export type When = { kind: 'once'; at: number } | { kind: 'cron'; cron: string; zone: string }

export type Missed = 'run' | 'skip'

export interface Watch {
  check: string
  input: Record<string, unknown>
}

export interface NewSchedule {
  owner: string
  subject: string
  when: When
  missed?: Missed
  watch?: Watch
  data?: unknown
}

export type Outcome = 'ran' | 'quiet' | 'missed' | 'failed'

export interface LastRun {
  at: number
  outcome: Outcome
  error?: string
}

export interface Schedule {
  id: string
  owner: string
  subject: string
  when: When
  missed: Missed
  watch?: Watch
  data: unknown
  paused: boolean
  next?: number
  last?: LastRun
  created: number
}

export interface Fire {
  key: string
  due: number
  late: boolean
  note?: string
}

export type Handler = (schedule: Schedule, fire: Fire, signal: AbortSignal) => Promise<void>

export type CheckResult = { fire: false; state: unknown } | { fire: true; state: unknown; note: string }

export interface Check<S extends ZodObject = ZodObject> {
  name: string
  description: string
  input: S
  run(input: output<S>, state: unknown, signal: AbortSignal): Promise<CheckResult>
}

export interface Schedules {
  handle(owner: string, handler: Handler): Dispose
  check<S extends ZodObject>(check: Check<S>): Dispose
  checks(): Check[]
  create(spec: NewSchedule): Schedule
  pause(id: string, paused: boolean): Schedule
  remove(id: string): boolean
  get(id: string): Schedule | undefined
  list(owner: string, subject?: string): Schedule[]
}

export const schedules = service<Schedules>('schedules')

export const scheduleChange = event<(schedule: Schedule) => void>('schedule.change')
export const scheduleRemove = event<(schedule: Schedule) => void>('schedule.remove')
export const checksChange = event<() => void>('schedule.checks')
