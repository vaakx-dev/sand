import type { When } from './event'

export const isDate = (when: When): when is { date: string } => 'date' in when

export const plainOf = (when: When) => (isDate(when) ? Temporal.PlainDate.from(when.date).toPlainDateTime() : Temporal.PlainDateTime.from(when.time))

export const zoneOf = (when: When, zone: string) => (isDate(when) ? zone : when.zone)

export const instant = (when: When, zone: string) => plainOf(when).toZonedDateTime(zoneOf(when, zone)).epochMilliseconds

export const whenOf = (plain: Temporal.PlainDateTime, like: When): When =>
  isDate(like) ? { date: plain.toPlainDate().toString() } : { time: plain.toString({ smallestUnit: 'second' }), zone: like.zone }

export const whenAt = (ms: number, like: When, zone: string): When =>
  whenOf(Temporal.Instant.fromEpochMilliseconds(ms).toZonedDateTimeISO(zoneOf(like, zone)).toPlainDateTime(), like)

export const whenKey = (when: When) => (isDate(when) ? when.date : `${when.time}~${when.zone}`)

export const sameWhen = (a: When, b: When) => (isDate(a) || isDate(b) ? plainOf(a).toPlainDate().equals(plainOf(b).toPlainDate()) : instant(a, 'UTC') === instant(b, 'UTC'))

export const validZone = (zone: string) => {
  try {
    return Temporal.ZonedDateTime.from({ year: 2000, month: 1, day: 1, timeZone: zone }).timeZoneId
  } catch {
    return undefined
  }
}
