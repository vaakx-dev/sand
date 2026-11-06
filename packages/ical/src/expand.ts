import type { Event, Range, Span, When } from './event'
import { recur } from './rrule/recur'
import { parseRule } from './rrule/rule'
import { instant, isDate, plainOf, sameWhen, whenAt, whenOf, zoneOf } from './when'

type Plain = Temporal.PlainDateTime

export interface Instance<E extends Event = Event> {
  event: E
  span: Span
  original?: When
}

const far = Temporal.PlainDateTime.from('9999-12-31T23:59:59')

const wallClock = (ms: number, zone: string) => Temporal.Instant.fromEpochMilliseconds(ms).toZonedDateTimeISO(zone).toPlainDateTime()

const plainIn = (when: When, series: When, zone: string) => {
  if (isDate(when) || isDate(series)) return isDate(series) ? plainOf(when).toPlainDate().toPlainDateTime() : plainOf(when).withPlainTime(plainOf(series).toPlainTime())
  return wallClock(instant(when, zone), series.zone)
}

const starts = (event: Event, end: Plain, zone: string): Plain[] => {
  const recurrence = event.recurrence
  if (!recurrence) return [plainOf(event.start)]
  const listed = (whens: When[] | undefined) => (whens ?? []).map(when => plainIn(when, event.start, zone))
  const skipped = listed(recurrence.exdates)
  const extra = listed(recurrence.rdates).filter(plain => Temporal.PlainDateTime.compare(plain, end) <= 0)
  const all = [...recur(parseRule(recurrence.rule), plainOf(event.start), zoneOf(event.start, zone), end), ...extra].sort(Temporal.PlainDateTime.compare)
  return all.filter((plain, index) => !skipped.some(skip => skip.equals(plain)) && (!index || !plain.equals(all[index - 1]!)))
}

const spanAt = (event: Event, start: Plain, zone: string): Span => {
  const begins = whenOf(start, event.start)
  if (isDate(event.start)) {
    const days = plainOf(event.start).until(plainOf(event.end)).days
    const ends = whenOf(start.add({ days }), event.end)
    return { start: begins, end: ends, from: instant(begins, zone), to: instant(ends, zone) }
  }
  const from = instant(begins, zone)
  const to = from + instant(event.end, zone) - instant(event.start, zone)
  return { start: begins, end: whenAt(to, event.end, zone), from, to }
}

const overlaps = (span: Span, range: Range) => span.from < range.to && (span.to > range.from || span.from >= range.from)

export const spans = (event: Event, range: Range, zone: string): Span[] => {
  const end = wallClock(range.to, zoneOf(event.start, zone)).add({ days: 1 })
  return starts(event, end, zone)
    .map(start => spanAt(event, start, zone))
    .filter(span => overlaps(span, range))
}

export const expand = <E extends Event>(series: E, overrides: E[], range: Range, zone: string): Instance<E>[] => {
  const moved = (span: Span) => overrides.some(override => override.original && sameWhen(override.original, span.start))
  const own: Instance<E>[] = series.recurrence
    ? spans(series, range, zone)
        .filter(span => !moved(span))
        .map(span => ({ event: series, span, original: span.start }))
    : spans(series, range, zone).map(span => ({ event: series, span }))
  const changed = overrides.filter(override => override.status !== 'cancelled').flatMap(override => spans(override, range, zone).map(span => ({ event: override, span, ...(override.original && { original: override.original }) })))
  return [...own, ...changed].sort((a, b) => a.span.from - b.span.from)
}

const dayPad = 14 * 3_600_000

export const bounds = (event: Event): { first: number; last: number | null } => {
  const pad = isDate(event.start) ? dayPad : 0
  const first = instant(event.start, 'UTC') - pad
  const rule = event.recurrence && parseRule(event.recurrence.rule)
  if (rule && !rule.count && !rule.until) return { first, last: null }
  const all = starts(event, far, 'UTC')
  const last = all.at(-1) ?? plainOf(event.start)
  return { first, last: spanAt(event, last, 'UTC').to + pad }
}
