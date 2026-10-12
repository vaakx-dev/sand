import { duration, exactTime } from '@sand/kit'
import { z } from 'zod'
import type { Schedule } from '../contract'

const units: Record<string, number> = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 }

const pastGrace = 60_000

export const whenFields = {
  at: z.string().optional().describe('Local date and time to run, like 2026-10-12T15:30'),
  in: z.string().optional().describe('Delay before running, like 90s, 10m, 2h or 1h30m'),
}

export const parseDuration = (text: string) => {
  const compact = text.replace(/\s+/g, '').toLowerCase()
  const parts = [...compact.matchAll(/(\d+(?:\.\d+)?)([smhd])/g)]
  if (!parts.length || parts.map(([whole]) => whole).join('') !== compact) {
    throw new Error(`"${text}" is not a duration; write it like 90s, 10m, 2h, 1d or 1h30m`)
  }
  return parts.reduce((ms, [, amount, unit]) => ms + Number(amount) * units[unit!]!, 0)
}

const parseTime = (text: string) => {
  const at = Date.parse(text)
  if (Number.isNaN(at)) throw new Error(`"${text}" is not a date and time; write it like 2026-10-12T15:30`)
  if (at < Date.now() - pastGrace) throw new Error(`${exactTime(at)} is in the past`)
  return at
}

export const firstRun = (at?: string, delay?: string, every?: number) => {
  if (at && delay) throw new Error('Give either at or in, not both')
  if (at) return parseTime(at)
  if (delay) return Date.now() + parseDuration(delay)
  if (every) return Date.now() + every
  throw new Error('Say when to run: at, in or every')
}

export const describeRun = (schedule: Schedule) => {
  const next = `${exactTime(schedule.at)} (in ${duration(schedule.at - Date.now())})`
  return schedule.every ? `${next}, then every ${duration(schedule.every)}` : next
}
