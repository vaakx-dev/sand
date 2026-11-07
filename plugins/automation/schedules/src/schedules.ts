import { uuid } from '@sand/util'
import type { Book } from './book'
import type { NewSchedule, Schedule, Schedules, When } from './contract'
import type { Registry } from './runner'
import { nextRun } from './time/next'
import { checkZone } from './time/zone'

const checkWhen = (when: When, now: number) => {
  if (when.kind === 'once') {
    if (when.at <= now) throw new Error('That time has already passed')
    return when.at
  }
  checkZone(when.zone)
  const next = nextRun(when, now)
  if (next === undefined) throw new Error(`"${when.cron}" never comes due`)
  return next
}

const resumedNext = (schedule: Schedule, now: number) => {
  if (schedule.when.kind === 'once') return Math.max(schedule.next ?? schedule.when.at, now)
  return nextRun(schedule.when, now)
}

export const createSchedules = (book: Book, { handlers }: Registry, plan: () => void): Schedules => {
  const known = (id: string) => {
    const found = book.get(id)
    if (!found) throw new Error(`No schedule ${id}`)
    return found
  }

  const list = (owner: string, subject?: string) =>
    book
      .all()
      .map(({ schedule }) => schedule)
      .filter(schedule => schedule.owner === owner && (subject === undefined || schedule.subject === subject))
      .sort((a, b) => a.created - b.created)

  const changed = <T>(result: T) => {
    plan()
    return result
  }

  return {
    handle(owner, handler) {
      if (handlers.has(owner)) throw new Error(`${owner} schedules already have a handler`)
      handlers.set(owner, handler)
      plan()
      return () => {
        if (handlers.get(owner) === handler) handlers.delete(owner)
      }
    },
    create({ owner, subject, when, missed = 'run', data = null }: NewSchedule) {
      const now = Date.now()
      const next = checkWhen(when, now)
      const schedule: Schedule = { id: uuid(), owner, subject, when, missed, data, paused: false, next, created: now }
      return changed(book.put({ schedule, state: undefined }))
    },
    pause(id, paused) {
      const { schedule, state } = known(id)
      const next = paused ? schedule.next : resumedNext(schedule, Date.now())
      return changed(book.put({ schedule: { ...schedule, paused, next }, state }))
    },
    remove: id => changed(book.drop(id)),
    get: id => book.get(id)?.schedule,
    list,
  }
}
