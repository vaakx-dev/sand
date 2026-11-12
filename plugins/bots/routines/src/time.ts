import { localInstant, systemZone, type When } from '@sand/schedules/contract'
import type { NewRoutine } from './contract'

export const zoneOf = (when: When) => (when.kind === 'cron' ? when.zone : systemZone())

export const timeIn = (instant: number, zone: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: zone, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(instant)

export const timing = (when: When) => (when.kind === 'once' ? `once, at ${timeIn(when.at, systemZone())}` : `repeats on cron ${when.cron} (${when.zone})`)

export const whenOf = ({ at, in_minutes, repeat, zone = systemZone() }: Pick<NewRoutine, 'at' | 'in_minutes' | 'repeat' | 'zone'>): When => {
  if ([at, in_minutes, repeat].filter(given => given !== undefined).length !== 1) throw new Error('Give exactly one of at, in_minutes or repeat')
  if (repeat !== undefined) return { kind: 'cron', cron: repeat, zone }
  if (in_minutes !== undefined) return { kind: 'once', at: Date.now() + in_minutes * 60_000 }
  return { kind: 'once', at: localInstant(at ?? '', zone) }
}
