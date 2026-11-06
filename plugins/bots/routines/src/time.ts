import { systemZone, type When } from '@sand/schedules/contract'

export const zoneOf = (when: When) => (when.kind === 'cron' ? when.zone : systemZone())

export const timeIn = (instant: number, zone: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: zone, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(instant)

export const timing = (when: When) => (when.kind === 'once' ? `once, at ${timeIn(when.at, systemZone())}` : `repeats on cron ${when.cron} (${when.zone})`)
