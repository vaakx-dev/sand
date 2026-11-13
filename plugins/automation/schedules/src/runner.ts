import { errorMessage } from '@sand/util'
import type { Book } from './book'
import type { Handler, Outcome, Schedule } from './contract'
import { nextRun } from './time/next'

export interface Registry {
  handlers: Map<string, Handler>
}

interface Result {
  outcome: Outcome
  state: unknown
  error?: string
}

const grace = 2 * 60_000
const longestWait = 1_000

export const createRunner = (book: Book, { handlers }: Registry) => {
  const running = new Set<string>()
  const stopped = new AbortController()
  let started = false
  let timer: Timer | undefined

  const ready = (schedule: Schedule) => !schedule.paused && schedule.next !== undefined && !running.has(schedule.id) && handlers.has(schedule.owner)

  const attempt = async (schedule: Schedule, handler: Handler, state: unknown, now: number): Promise<Result> => {
    const due = schedule.next!
    const late = now - due > grace
    if (late && schedule.missed === 'skip') return { outcome: 'missed', state }
    try {
      await handler(schedule, { key: `${schedule.id}@${due}`, due, late }, stopped.signal)
      return { outcome: 'ran', state }
    } catch (error) {
      return { outcome: 'failed', state, error: errorMessage(error) }
    }
  }

  const settle = (id: string, { outcome, state, error }: Result) => {
    const found = book.get(id)
    if (!found) return
    const { schedule } = found
    const now = Date.now()
    if (schedule.when.kind === 'once' && outcome !== 'failed') return void book.drop(id)
    const next = schedule.when.kind === 'cron' ? nextRun(schedule.when, now) : undefined
    book.put({ schedule: { ...schedule, next, last: { at: now, outcome, ...(error && { error }) } }, state })
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
    timer = setTimeout(tick, Math.min(Math.max(soonest - Date.now(), 0), longestWait))
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
