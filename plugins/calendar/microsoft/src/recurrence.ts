import type { Recurrence, When } from '@sand/calendar/contract'
import { isDate, parseRule, plainOf, ruleText, utcStamp, type Rule } from '@sand/ical'
import type { Day, Index, Pattern, Repeat, Span } from './graph'
import { windowsZone } from './zones'

export type PatternBody = Pick<Pattern, 'type' | 'interval'> & Partial<Pattern>

export type SpanBody = Pick<Span, 'type' | 'startDate'> & Partial<Span>

export interface RepeatBody {
  pattern: PatternBody
  range: SpanBody
}

type Weekday = NonNullable<Rule['byDay']>[number]

const days: Day[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const positions: Index[] = ['first', 'second', 'third', 'fourth']

const dayNumber = (day: Day) => days.indexOf(day) + 1

const dayName = (number: number) => {
  const day = days[number - 1]
  if (!day) throw new Error(`Unknown weekday ${number}`)
  return day
}

const setPosition = (index: Index) => (index === 'last' ? -1 : positions.indexOf(index) + 1)

const indexAt = (position: number | undefined): Index | undefined => (position === -1 ? 'last' : positions[(position ?? 0) - 1])

const weekdays = (pattern: Pattern): Weekday[] => pattern.daysOfWeek.map(day => ({ nth: 0, day: dayNumber(day) }))

const shapes: Record<Pattern['type'], (pattern: Pattern) => Pick<Rule, 'freq' | 'byDay' | 'byMonthDay' | 'byMonth' | 'bySetPos'>> = {
  daily: () => ({ freq: 'DAILY' }),
  weekly: pattern => ({ freq: 'WEEKLY', byDay: weekdays(pattern) }),
  absoluteMonthly: pattern => ({ freq: 'MONTHLY', byMonthDay: [pattern.dayOfMonth] }),
  relativeMonthly: pattern => ({ freq: 'MONTHLY', byDay: weekdays(pattern), bySetPos: [setPosition(pattern.index)] }),
  absoluteYearly: pattern => ({ freq: 'YEARLY', byMonth: [pattern.month], byMonthDay: [pattern.dayOfMonth] }),
  relativeYearly: pattern => ({ freq: 'YEARLY', byMonth: [pattern.month], byDay: weekdays(pattern), bySetPos: [setPosition(pattern.index)] }),
}

const untilOf = (date: string, start: When) =>
  isDate(start) ? date.replaceAll('-', '') : utcStamp(Temporal.PlainDate.from(date).toPlainDateTime(plainOf(start).toPlainTime()).toZonedDateTime(start.zone).epochMilliseconds)

const ends = (range: Span, start: When): Pick<Rule, 'count' | 'until'> => {
  if (range.type === 'numbered') return { count: range.numberOfOccurrences }
  if (range.type === 'endDate') return { until: untilOf(range.endDate, start) }
  return {}
}

export const ruleOf = ({ pattern, range }: Repeat, start: When) =>
  ruleText({ interval: pattern.interval, wkst: pattern.type === 'weekly' ? dayNumber(pattern.firstDayOfWeek) : 1, ...shapes[pattern.type](pattern), ...ends(range, start) })

const unsupported = (text: string) => new Error(`Outlook can't repeat an event by ${text}`)

const one = (values: number[] | undefined, text: string) => {
  if (values && values.length !== 1) throw unsupported(text)
  return values?.[0]
}

const relativeOf = (rule: Rule, byDay: Weekday[], text: string) => {
  const nth = byDay[0]?.nth ?? 0
  if (rule.byMonthDay || byDay.some(day => day.nth !== nth) || (nth && rule.bySetPos)) throw unsupported(text)
  const index = indexAt(nth || one(rule.bySetPos, text))
  if (!index) throw unsupported(text)
  return { daysOfWeek: byDay.map(day => dayName(day.day)), index }
}

const monthly = (rule: Rule, start: Temporal.PlainDate, text: string, period: 'Monthly' | 'Yearly') => {
  if (rule.byDay) return { type: `relative${period}` as const, ...relativeOf(rule, rule.byDay, text) }
  const dayOfMonth = one(rule.byMonthDay, text) ?? start.day
  if (dayOfMonth < 1 || rule.bySetPos) throw unsupported(text)
  return { type: `absolute${period}` as const, dayOfMonth }
}

const patternOf = (rule: Rule, start: Temporal.PlainDate, text: string): PatternBody => {
  if (rule.bySecond || rule.byMinute || rule.byHour || rule.byYearDay || rule.byWeekNo) throw unsupported(text)
  const { freq, interval } = rule
  if (freq === 'DAILY' && !rule.byDay) {
    if (rule.byMonth || rule.byMonthDay || rule.bySetPos) throw unsupported(text)
    return { type: 'daily', interval }
  }
  if (freq === 'WEEKLY' || (freq === 'DAILY' && interval === 1)) {
    if (rule.byMonth || rule.byMonthDay || rule.bySetPos || rule.byDay?.some(day => day.nth)) throw unsupported(text)
    const daysOfWeek = (rule.byDay?.map(day => day.day) ?? [start.dayOfWeek]).map(dayName)
    return { type: 'weekly', interval, daysOfWeek, firstDayOfWeek: dayName(rule.wkst) }
  }
  if (freq === 'MONTHLY' && !rule.byMonth) return { interval, ...monthly(rule, start, text, 'Monthly') }
  if (freq === 'YEARLY') return { interval, month: one(rule.byMonth, text) ?? start.month, ...monthly(rule, start, text, 'Yearly') }
  throw unsupported(text)
}

const stamp = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z?))?$/

const lastDay = (until: string, start: When) => {
  const match = stamp.exec(until)
  if (!match) throw new Error(`Bad UNTIL ${until}`)
  const [, year, month, day, hour, minute, second, utc] = match
  const date = Temporal.PlainDate.from(`${year}-${month}-${day}`)
  if (isDate(start) || hour === undefined) return date
  const local = Temporal.PlainDateTime.from(`${date}T${hour}:${minute}:${second}`)
  const wall = utc ? local.toZonedDateTime('UTC').withTimeZone(start.zone).toPlainDateTime() : local
  const before = Temporal.PlainTime.compare(wall.toPlainTime(), plainOf(start).toPlainTime()) < 0
  return before ? wall.toPlainDate().subtract({ days: 1 }) : wall.toPlainDate()
}

const rangeOf = (rule: Rule, start: When, zone: string): SpanBody => {
  const base = { startDate: plainOf(start).toPlainDate().toString(), recurrenceTimeZone: windowsZone(isDate(start) ? zone : start.zone) }
  if (rule.count) return { type: 'numbered', numberOfOccurrences: rule.count, ...base }
  if (rule.until) return { type: 'endDate', endDate: lastDay(rule.until, start).toString(), ...base }
  return { type: 'noEnd', ...base }
}

export const repeatBody = (recurrence: Recurrence, start: When, zone: string): RepeatBody => {
  if (recurrence.rdates?.length) throw new Error("Outlook can't add single extra dates to a series")
  const rule = parseRule(recurrence.rule)
  return { pattern: patternOf(rule, plainOf(start).toPlainDate(), recurrence.rule), range: rangeOf(rule, start, zone) }
}
