import type { Dispose } from 'drydock'
import type { FetchInfo } from '../status/remote'
import { type FetchOutcome, fetchOrigin } from './origin'

const interval = 5 * 60_000
const ceiling = 30 * 60_000

interface Schedule {
  dir: string
  users: number
  failures: number
  attemptedAt?: number
  timer?: Timer
  running?: Promise<void>
  info: FetchInfo
}

export interface Fetches {
  join(commonDir: string): Dispose
  now(commonDir: string): Promise<void>
  info(commonDir: string): FetchInfo
  close(): void
}

export const createFetches = (fetched: (commonDir: string) => void): Fetches => {
  const schedules = new Map<string, Schedule>()
  let closed = false

  const scheduleOf = (dir: string) => {
    const known = schedules.get(dir)
    if (known) return known
    const created: Schedule = { dir, users: 0, failures: 0, info: {} }
    schedules.set(dir, created)
    return created
  }

  const pause = (schedule: Schedule) => (schedule.failures ? Math.min(interval * 2 ** schedule.failures, ceiling) : interval)

  const plan = (schedule: Schedule) => {
    clearTimeout(schedule.timer)
    schedule.timer = undefined
    if (closed || !schedule.users || schedule.running) return
    const due = schedule.attemptedAt === undefined ? 0 : schedule.attemptedAt + pause(schedule) - Date.now()
    schedule.timer = setTimeout(() => void run(schedule), Math.max(0, due))
  }

  const settle = (schedule: Schedule, outcome: FetchOutcome) => {
    if (!outcome) return
    if (outcome.ok) {
      schedule.failures = 0
      schedule.info = { fetchedAt: Date.now() }
    } else {
      schedule.failures++
      schedule.info = { ...schedule.info, fetchError: outcome.error }
    }
  }

  const run = (schedule: Schedule) => {
    if (schedule.running) return schedule.running
    clearTimeout(schedule.timer)
    schedule.attemptedAt = Date.now()
    schedule.running = fetchOrigin(schedule.dir)
      .then(outcome => settle(schedule, outcome))
      .finally(() => {
        schedule.running = undefined
        if (closed) return
        plan(schedule)
        fetched(schedule.dir)
      })
    return schedule.running
  }

  return {
    join(commonDir) {
      const schedule = scheduleOf(commonDir)
      schedule.users++
      if (schedule.users === 1) plan(schedule)
      return () => {
        schedule.users--
        if (!schedule.users) plan(schedule)
      }
    },
    now: commonDir => run(scheduleOf(commonDir)),
    info: commonDir => schedules.get(commonDir)?.info ?? {},
    close() {
      closed = true
      for (const schedule of schedules.values()) clearTimeout(schedule.timer)
      schedules.clear()
    },
  }
}
