import { errorMessage } from '@sand/util'
import type { Book } from './book'
import type { Handler, Outcome, Retry, Schedule } from './contract'
import { nextRun } from './time/next'

export interface Registry {
  handlers: Map<string, Handler>
}

interface Result {
  outcome: Outcome
  state: unknown
  error?: string
  retry?: Retry & { at: number }
}

const GRACE = 2 * 60_000
const LONGEST_WAIT = 1_000
const RETRY_GAPS = [60_000, 5 * 60_000, 15 * 60_000]

const dueOf = (schedule: Schedule) => schedule.retry?.due ?? schedule.next!

const attemptOf = (schedule: Schedule) => schedule.retry?.attempt ?? 0

const keyOf = (schedule: Schedule) => {
  const key = `${schedule.id}@${dueOf(schedule)}`
  const attempt = attemptOf(schedule)
  return attempt ? `${key}#${attempt}` : key
}

const retryOf = (schedule: Schedule, now: number): Result['retry'] => {
  const gap = RETRY_GAPS[attemptOf(schedule)]
  if (gap === undefined) return undefined
  const at = now + gap
  const regular = schedule.when.kind === 'cron' ? nextRun(schedule.when, now) : undefined
  if (regular !== undefined && regular <= at) return undefined
  return { due: dueOf(schedule), attempt: attemptOf(schedule) + 1, at }
}

export const createRunner = (book: Book, { handlers }: Registry) => {
  const running = new Set<string>()
  const stopped = new AbortController()
  let started = false
  let timer: Timer | undefined

  const ready = (schedule: Schedule) => !schedule.paused && schedule.next !== undefined && !running.has(schedule.id) && handlers.has(schedule.owner)

  const attempt = async (schedule: Schedule, handler: Handler, state: unknown, now: number): Promise<Result> => {
    if (schedule.missed === 'skip' && now - schedule.next! > GRACE) return { outcome: 'missed', state }
    const due = dueOf(schedule)
    const retry = retryOf(schedule, now)
    try {
      await handler(schedule, { key: keyOf(schedule), due, late: now - due > GRACE, final: !retry }, stopped.signal)
      return { outcome: 'ran', state }
    } catch (error) {
      return { outcome: 'failed', state, error: errorMessage(error), retry }
    }
  }

  const settle = (id: string, { outcome, state, error, retry }: Result) => {
    const found = book.get(id)
    if (!found) return
    const { schedule } = found
    const now = Date.now()
    const last = { at: now, outcome, ...(error && { error }) }
    if (retry) {
      const { at, ...next } = retry
      return void book.put({ schedule: { ...schedule, next: at, retry: next, last }, state })
    }
    if (schedule.when.kind === 'once' && outcome !== 'failed') return void book.drop(id)
    const next = schedule.when.kind === 'cron' ? nextRun(schedule.when, now) : undefined
    book.put({ schedule: { ...schedule, next, retry: undefined, last }, state })
  }

  const fire = async (id: string, now: number) => {
    const { schedule, state } = book.get(id)!
    const handler = handlers.get(schedule.owner)!
    running.add(id)
    const result = await attempt(schedule, handler, state, now)
    running.delete(id)
    if (stopped.signal.aborted) return
    settle(id, result)
    plan()
  }

  const tick = () => {
    const now = Date.now()
    for (const { schedule } of book.all()) if (ready(schedule) && schedule.next! <= now) void fire(schedule.id, now)
    plan()
  }

  const plan = () => {
    clearTimeout(timer)
    if (!started || stopped.signal.aborted) return
    const soonest = Math.min(...book.all().map(({ schedule }) => (ready(schedule) ? schedule.next! : Infinity)))
    if (soonest === Infinity) return
    timer = setTimeout(tick, Math.min(Math.max(soonest - Date.now(), 0), LONGEST_WAIT))
  }

  return {
    plan,
    start() {
      if (stopped.signal.aborted) return
      book.load()
      started = true
      plan()
    },
    stop() {
      stopped.abort()
      clearTimeout(timer)
    },
  }
}
