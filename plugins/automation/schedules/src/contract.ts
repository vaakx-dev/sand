import { event, service, type Dispose } from 'drydock'

export { localInstant, systemZone } from './time/zone'

export type When = { kind: 'once'; at: number } | { kind: 'cron'; cron: string; zone: string }

export type Missed = 'run' | 'skip'

export interface NewSchedule {
  owner: string
  subject: string
  when: When
  missed?: Missed
  data?: unknown
}

export type Outcome = 'ran' | 'missed' | 'failed'

export interface LastRun {
  at: number
  outcome: Outcome
  error?: string
}

export interface Retry {
  due: number
  attempt: number
}

export interface Schedule {
  id: string
  owner: string
  subject: string
  when: When
  missed: Missed
  data: unknown
  paused: boolean
  next?: number
  last?: LastRun
  retry?: Retry
  created: number
}

export interface Fire {
  key: string
  due: number
  late: boolean
  final: boolean
}

export type Handler = (schedule: Schedule, fire: Fire, signal: AbortSignal) => Promise<void>

export interface Schedules {
  handle(owner: string, handler: Handler): Dispose
  create(spec: NewSchedule): Schedule
  pause(id: string, paused: boolean): Schedule
  remove(id: string): boolean
  get(id: string): Schedule | undefined
  list(owner: string, subject?: string): Schedule[]
}

export const schedules = service<Schedules>('schedules')

export const scheduleChange = event<(schedule: Schedule) => void>('schedule.change')
export const scheduleRemove = event<(schedule: Schedule) => void>('schedule.remove')
