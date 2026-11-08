import type { When } from '@sand/calendar/contract'

export const dayMs = 86_400_000

export const browserZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone

export const startOfDay = (at: number) => {
  const day = new Date(at)
  day.setHours(0, 0, 0, 0)
  return day.getTime()
}

export const addDays = (at: number, days: number) => {
  const day = new Date(at)
  day.setDate(day.getDate() + days)
  return day.getTime()
}

export const startOfWeek = (at: number) => {
  const day = new Date(startOfDay(at))
  return addDays(day.getTime(), -((day.getDay() + 6) % 7))
}

export const days = (from: number, count: number) => Array.from({ length: count }, (_, index) => addDays(from, index))

const pad = (value: number) => String(value).padStart(2, '0')

export const dateInput = (at: number) => {
  const day = new Date(at)
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`
}

export const timeInput = (at: number) => {
  const time = new Date(at)
  return `${pad(time.getHours())}:${pad(time.getMinutes())}`
}

export const fromInputs = (date: string, time: string) => new Date(`${date}T${time || '00:00'}`).getTime()

export const isAllDay = (when: When) => 'date' in when

const format = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(undefined, options)

const formats = {
  day: format({ weekday: 'long', day: 'numeric', month: 'long' }),
  short: format({ weekday: 'short', day: 'numeric' }),
  weekday: format({ weekday: 'short' }),
  month: format({ month: 'long', year: 'numeric' }),
  shortMonth: format({ month: 'short', year: 'numeric' }),
  range: format({ day: 'numeric', month: 'short', year: 'numeric' }),
  clock: format({ hour: 'numeric', minute: '2-digit' }),
  moment: format({ weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }),
  hour: format({ hour: 'numeric' }),
}

export const dayLabel = (at: number) => formats.day.format(at)

const nearDays = ['Today', 'Tomorrow']

export const dayHeading = (day: number) => nearDays[Math.round((day - startOfDay(Date.now())) / dayMs)] ?? dayLabel(day)

export const weekdayLabel = (at: number) => formats.weekday.format(at)

const sameMonth = (from: number, to: number) => new Date(from).getMonth() === new Date(to - 1).getMonth()

export const monthsLabel = (from: number, to: number, short: boolean) => {
  if (sameMonth(from, to)) return (short ? formats.shortMonth : formats.month).format(from)
  return formats.shortMonth.formatRange(from, to - 1)
}

export const clockLabel = (at: number) => formats.clock.format(at)

export const hourLabel = (at: number) => formats.hour.format(at)

export const spanLabel = ({ start, from, to }: { start: When; from: number; to: number }) => {
  if (isAllDay(start)) return to - from > dayMs ? `${formats.range.formatRange(from, to - 1)} · all day` : `${dayLabel(from)} · all day`
  return startOfDay(from) === startOfDay(to - 1) ? `${dayLabel(from)} · ${formats.clock.formatRange(from, to)}` : formats.moment.formatRange(from, to)
}
