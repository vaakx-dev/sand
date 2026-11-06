import { uuid } from '@sand/util'
import type { Context } from 'drydock'
import type { Book } from './book'
import { type Check, checksChange, type NewSchedule, type Schedule, type Schedules, type Watch, type When } from './contract'
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

const checkWatch = (checks: Map<string, Check>, watch: Watch): Watch => {
  const check = checks.get(watch.check)
  if (!check) throw new Error(`No check named ${watch.check}; the checks are ${[...checks.keys()].join(', ') || 'none'}`)
  return { check: watch.check, input: check.input.parse(watch.input) }
}

const resumedNext = (schedule: Schedule, now: number) => {
  if (schedule.when.kind === 'once') return Math.max(schedule.next ?? schedule.when.at, now)
  return nextRun(schedule.when, now)
}

export const createSchedules = (ctx: Context, book: Book, { handlers, checks }: Registry, plan: () => void): Schedules => {
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
    check(check) {
      if (checks.has(check.name)) throw new Error(`A check named ${check.name} already exists`)
      checks.set(check.name, check)
      ctx.emit(checksChange)
      return () => {
        if (checks.get(check.name) !== check) return
        checks.delete(check.name)
        ctx.emit(checksChange)
      }
    },
    checks: () => [...checks.values()],
    create({ owner, subject, when, missed = 'run', watch, data = null }: NewSchedule) {
      const now = Date.now()
      const next = checkWhen(when, now)
      const schedule: Schedule = { id: uuid(), owner, subject, when, missed, ...(watch && { watch: checkWatch(checks, watch) }), data, paused: false, next, created: now }
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
