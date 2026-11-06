export const frequencies = ['SECONDLY', 'MINUTELY', 'HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const

export type Frequency = (typeof frequencies)[number]

export const weekdays = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const

export interface Weekday {
  nth: number
  day: number
}

export interface Rule {
  freq: Frequency
  interval: number
  count?: number
  until?: string
  bySecond?: number[]
  byMinute?: number[]
  byHour?: number[]
  byDay?: Weekday[]
  byMonthDay?: number[]
  byYearDay?: number[]
  byWeekNo?: number[]
  byMonth?: number[]
  bySetPos?: number[]
  wkst: number
}

type ListKey = 'bySecond' | 'byMinute' | 'byHour' | 'byMonthDay' | 'byYearDay' | 'byWeekNo' | 'byMonth' | 'bySetPos'

const lists: Record<string, [ListKey, number, number]> = {
  BYSECOND: ['bySecond', 0, 60],
  BYMINUTE: ['byMinute', 0, 59],
  BYHOUR: ['byHour', 0, 23],
  BYMONTHDAY: ['byMonthDay', -31, 31],
  BYYEARDAY: ['byYearDay', -366, 366],
  BYWEEKNO: ['byWeekNo', -53, 53],
  BYMONTH: ['byMonth', 1, 12],
  BYSETPOS: ['bySetPos', -366, 366],
}

const dayIndex = (code: string) => {
  const index = weekdays.indexOf(code as (typeof weekdays)[number])
  if (index < 0) throw new Error(`Unknown weekday ${code}`)
  return index + 1
}

const numbers = (name: string, value: string, min: number, max: number) =>
  value.split(',').map(part => {
    const number = Number(part)
    if (!Number.isInteger(number) || number < min || number > max || (min < 0 && number === 0)) throw new Error(`Bad ${name} value ${part}`)
    return number
  })

const weekday = (part: string): Weekday => {
  const match = /^([+-]?\d{1,2})?([A-Z]{2})$/.exec(part)
  if (!match) throw new Error(`Bad BYDAY value ${part}`)
  return { nth: Number(match[1] ?? 0), day: dayIndex(match[2]!) }
}

export const parseRule = (text: string): Rule => {
  const parts = new Map(
    text
      .replace(/^RRULE:/i, '')
      .split(';')
      .filter(Boolean)
      .map(part => {
        const [key = '', value = ''] = part.split('=')
        return [key.toUpperCase(), value.toUpperCase()] as const
      }),
  )
  const freq = frequencies.find(known => known === parts.get('FREQ'))
  if (!freq) throw new Error(`A recurrence rule needs a FREQ, got "${text}"`)
  const rule: Rule = { freq, interval: Number(parts.get('INTERVAL') ?? 1), wkst: dayIndex(parts.get('WKST') ?? 'MO') }
  if (!Number.isInteger(rule.interval) || rule.interval < 1) throw new Error(`Bad INTERVAL in "${text}"`)
  const count = parts.get('COUNT')
  const until = parts.get('UNTIL')
  if (count && until) throw new Error(`A recurrence rule can't have both COUNT and UNTIL: "${text}"`)
  if (count) rule.count = numbers('COUNT', count, 1, Number.MAX_SAFE_INTEGER)[0]
  if (until) rule.until = until
  const byDay = parts.get('BYDAY')
  if (byDay) rule.byDay = byDay.split(',').map(weekday)
  for (const [key, value] of parts) {
    const list = lists[key]
    if (list) rule[list[0]] = numbers(key, value, list[1], list[2])
  }
  return rule
}

const dayText = ({ nth, day }: Weekday) => `${nth || ''}${weekdays[day - 1]}`

export const ruleText = (rule: Rule) =>
  [
    `FREQ=${rule.freq}`,
    rule.interval > 1 && `INTERVAL=${rule.interval}`,
    rule.count && `COUNT=${rule.count}`,
    rule.until && `UNTIL=${rule.until}`,
    ...Object.entries(lists).map(([key, [name]]) => rule[name] && `${key}=${rule[name].join(',')}`),
    rule.byDay && `BYDAY=${rule.byDay.map(dayText).join(',')}`,
    rule.wkst !== 1 && `WKST=${weekdays[rule.wkst - 1]}`,
  ]
    .filter(Boolean)
    .join(';')
