import type { JobRun } from '@sand/bots/contract'
import { DAY_MS } from '@sand/util'

type Tone = 'plain' | 'needs' | 'quiet'

interface RunRow {
  at: string
  text: string
  tone: Tone
}

const WEEK_MS = 6 * DAY_MS

const NOTHING = 'Nothing to do'

const sameDay = (first: number, second: number) => new Date(first).toDateString() === new Date(second).toDateString()

const dayOf = (at: number, now: number) => {
  if (sameDay(at, now)) return 'Today'
  if (sameDay(at, now - DAY_MS)) return 'Yesterday'
  if (now - at < WEEK_MS) return new Date(at).toLocaleDateString(undefined, { weekday: 'short' })
  return new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const clockOf = (at: number) => new Date(at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

const momentOf = (at: number, now = Date.now()) => (now - at < WEEK_MS ? `${dayOf(at, now)} ${clockOf(at)}` : dayOf(at, now))

const quiet = (run: JobRun) => run.outcome === 'nothing'

const streaks = (runs: JobRun[]) =>
  runs.reduce<JobRun[][]>((all, run) => {
    const last = all.at(-1)
    if (last && quiet(run) && quiet(last[0]!)) return [...all.slice(0, -1), [...last, run]]
    return [...all, [run]]
  }, [])

const rowOf = (streak: JobRun[], now: number): RunRow => {
  const [first] = streak as [JobRun, ...JobRun[]]
  if (!quiet(first)) return { at: momentOf(first.at, now), text: first.summary, tone: first.outcome === 'needs' ? 'needs' : 'plain' }
  const days = [...new Set(streak.map(run => dayOf(run.at, now)))]
  return { at: streak.length > 1 ? days.join(', ') : momentOf(first.at, now), text: NOTHING, tone: 'quiet' }
}

const runRows = (runs: JobRun[], now = Date.now()) => streaks(runs).map(streak => rowOf(streak, now))

export { momentOf, NOTHING, runRows, type RunRow }
