import { readStamp } from '../stamp'
import type { Frequency, Rule } from './rule'

type Plain = Temporal.PlainDateTime
type Day = Temporal.PlainDate

const subDaily: Partial<Record<Frequency, 'hours' | 'minutes' | 'seconds'>> = { HOURLY: 'hours', MINUTELY: 'minutes', SECONDLY: 'seconds' }

const withDefaults = (rule: Rule, start: Plain): Rule => {
  if (rule.byWeekNo || rule.byYearDay || rule.byMonthDay || rule.byDay) return rule
  if (rule.freq === 'YEARLY') return { ...rule, byMonth: rule.byMonth ?? [start.month], byMonthDay: [start.day] }
  if (rule.freq === 'MONTHLY') return { ...rule, byMonthDay: [start.day] }
  if (rule.freq === 'WEEKLY') return { ...rule, byDay: [{ nth: 0, day: start.dayOfWeek }] }
  return rule
}

const weekStart = (day: Day, wkst: number) => day.subtract({ days: (day.dayOfWeek - wkst + 7) % 7 })

const firstWeek = (year: number, wkst: number) => weekStart(Temporal.PlainDate.from({ year, month: 1, day: 4 }), wkst)

const daysFrom = (first: Day, count: number) => Array.from({ length: count }, (_, index) => first.add({ days: index }))

const monthDays = (year: number, month: number) => {
  const first = Temporal.PlainDate.from({ year, month, day: 1 })
  return daysFrom(first, first.daysInMonth)
}

const sorted = (values: number[]) => [...values].sort((a, b) => a - b)

const relative = (index: number, length: number) => (index > 0 ? index : length + index + 1)

const weekNo = (day: Day, year: number, wkst: number) => {
  const first = firstWeek(year, wkst)
  const weeks = first.until(firstWeek(year + 1, wkst)).days / 7
  const number = Math.floor(first.until(day).days / 7) + 1
  return { number, weeks }
}

const nthIn = (day: Day, inMonth: boolean) => {
  const at = inMonth ? day.day : day.dayOfYear
  const length = inMonth ? day.daysInMonth : day.daysInYear
  return [Math.ceil(at / 7), -(Math.floor((length - at) / 7) + 1)]
}

const ordinalsInMonth = (rule: Rule) => rule.freq === 'MONTHLY' || (rule.freq === 'YEARLY' && Boolean(rule.byMonth))

const ordinalsAllowed = (rule: Rule) => (rule.freq === 'MONTHLY' || rule.freq === 'YEARLY') && !rule.byWeekNo

const dayMatches = (rule: Rule, day: Day) => {
  const { byMonth, byYearDay, byMonthDay, byDay } = rule
  if (byMonth && !byMonth.includes(day.month)) return false
  if (byYearDay && !byYearDay.some(n => relative(n, day.daysInYear) === day.dayOfYear)) return false
  if (byMonthDay && !byMonthDay.some(n => relative(n, day.daysInMonth) === day.day)) return false
  if (!byDay) return true
  const nth = nthIn(day, ordinalsInMonth(rule))
  return byDay.some(({ nth: wanted, day: weekday }) => weekday === day.dayOfWeek && (!wanted || !ordinalsAllowed(rule) || nth.includes(wanted)))
}

const yearDays = (rule: Rule, year: number) => {
  if (rule.byWeekNo) {
    const first = firstWeek(year, rule.wkst)
    const days = daysFrom(first, first.until(firstWeek(year + 1, rule.wkst)).days)
    return days.filter(day => {
      const { number, weeks } = weekNo(day, year, rule.wkst)
      return rule.byWeekNo!.some(n => relative(n, weeks) === number)
    })
  }
  return (rule.byMonth ? sorted(rule.byMonth) : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]).flatMap(month => monthDays(year, month))
}

interface Period {
  begins: Plain
  days: Day[]
  at?: Plain
}

const period = (rule: Rule, start: Plain, k: number): Period => {
  const step = k * rule.interval
  const unit = subDaily[rule.freq]
  if (unit) {
    const at = start.add({ [unit]: step })
    return { begins: at, days: [at.toPlainDate()], at }
  }
  if (rule.freq === 'DAILY') {
    const day = start.toPlainDate().add({ days: step })
    return { begins: day.toPlainDateTime(), days: [day] }
  }
  if (rule.freq === 'WEEKLY') {
    const first = weekStart(start.toPlainDate(), rule.wkst).add({ weeks: step })
    return { begins: first.toPlainDateTime(), days: daysFrom(first, 7) }
  }
  if (rule.freq === 'MONTHLY') {
    const month = Temporal.PlainYearMonth.from({ year: start.year, month: start.month }).add({ months: step })
    return { begins: month.toPlainDate({ day: 1 }).toPlainDateTime(), days: monthDays(month.year, month.month) }
  }
  const year = start.year + step
  return { begins: Temporal.PlainDate.from({ year, month: 1, day: 1 }).subtract({ days: 7 }).toPlainDateTime(), days: yearDays(rule, year) }
}

const clock = (rule: Rule, start: Plain, at: Plain | undefined) => {
  const pick = (own: number, fixed: boolean, by: number[] | undefined) => (fixed ? (!by || by.includes(own) ? [own] : []) : sorted(by ?? [own]))
  const unit = subDaily[rule.freq]
  const hours = pick(at?.hour ?? start.hour, Boolean(at), rule.byHour)
  const minutes = pick(at?.minute ?? start.minute, unit === 'minutes' || unit === 'seconds', rule.byMinute)
  const seconds = pick(at?.second ?? start.second, unit === 'seconds', rule.bySecond)
  return hours.flatMap(hour => minutes.flatMap(minute => seconds.map(second => ({ hour, minute, second }))))
}

const setPositions = (set: Plain[], positions: number[] | undefined) => {
  if (!positions) return set
  const picked = positions.flatMap(n => set[relative(n, set.length) - 1] ?? [])
  return picked.sort(Temporal.PlainDateTime.compare).filter((item, index) => !index || !item.equals(picked[index - 1]!))
}

const candidates = (rule: Rule, start: Plain, { days, at }: Period) => {
  const times = clock(rule, start, at)
  const set = days.filter(day => dayMatches(rule, day)).flatMap(day => times.map(time => day.toPlainDateTime(time)))
  return setPositions(set, rule.bySetPos)
}

const lastYear = 9999

const periodsLeftToday = (rule: Rule, at: Plain) => {
  const unit = subDaily[rule.freq]!
  const left = at.until(at.toPlainDate().add({ days: 1 }).toPlainDateTime(), { largestUnit: unit }).total(unit)
  return Math.ceil(left / rule.interval) - 1
}

const untilOf = (until: string, zone: string): Plain => {
  const stamp = readStamp(until)
  if (stamp.kind === 'date') return stamp.date.toPlainDateTime({ hour: 23, minute: 59, second: 59 })
  if (stamp.kind === 'local') return stamp.plain
  return stamp.instant.toZonedDateTimeISO(zone).toPlainDateTime()
}

const earlier = (a: Plain, b: Plain) => (Temporal.PlainDateTime.compare(a, b) < 0 ? a : b)

export function* recur(given: Rule, start: Plain, zone: string, bound: Plain): Generator<Plain> {
  const rule = withDefaults(given, start)
  const end = rule.until ? earlier(untilOf(rule.until, zone), bound) : bound
  let count = 1
  yield start
  for (let k = 0; ; k++) {
    if (rule.count && count >= rule.count) return
    const current = period(rule, start, k)
    if (Temporal.PlainDateTime.compare(current.begins, end) > 0 || current.begins.year > lastYear) return
    if (current.at && !dayMatches(rule, current.at.toPlainDate())) {
      k += periodsLeftToday(rule, current.at)
      continue
    }
    for (const next of candidates(rule, start, current)) {
      if (Temporal.PlainDateTime.compare(next, start) <= 0) continue
      if (Temporal.PlainDateTime.compare(next, end) > 0) return
      yield next
      count++
      if (rule.count && count >= rule.count) return
    }
  }
}
