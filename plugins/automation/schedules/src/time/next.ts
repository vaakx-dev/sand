import type { When } from '../contract'
import { type Cron, matchesDay, parseCron } from './cron'
import { instantsOf, keyOf, wallOf } from './zone'

const dayMs = 24 * 60 * 60 * 1000
const searchedDays = 5 * 366

const nextCron = (cron: Cron, zone: string, after: number) => {
  const start = wallOf(after, zone)
  const startKey = keyOf(start)
  const firstDay = Date.UTC(start.year, start.month - 1, start.day)
  for (let day = firstDay; day < firstDay + searchedDays * dayMs; day += dayMs) {
    const date = new Date(day)
    if (!matchesDay(cron, date)) continue
    const [year, month, dayOfMonth] = [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()]
    for (const hour of cron.hours)
      for (const minute of cron.minutes) {
        const wall = { year, month, day: dayOfMonth, hour, minute }
        if (keyOf(wall) <= startKey) continue
        const instant = instantsOf(wall, zone).find(candidate => candidate > after)
        if (instant !== undefined) return instant
      }
  }
  return undefined
}

export const nextRun = (when: When, after: number) => {
  if (when.kind === 'once') return when.at > after ? when.at : undefined
  return nextCron(parseCron(when.cron), when.zone, after)
}
