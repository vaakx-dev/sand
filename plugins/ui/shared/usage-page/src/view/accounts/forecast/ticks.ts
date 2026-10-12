import { day, hour, startOfHour } from '../../../data/forecast/hours'

export interface Tick {
  at: number
  label: string
}

const most = 6

const hourSteps = [1, 2, 3, 4, 6, 12]

const daySteps = [1, 2, 3, 7]

const pick = (steps: number[], span: number, unit: number) => steps.find(step => span / (step * unit) <= most) ?? steps.at(-1)!

const hourTicks = (start: number, end: number): Tick[] => {
  const step = pick(hourSteps, end - start, hour)
  const ticks: Tick[] = []
  for (let at = startOfHour(start) + hour; at < end; at += hour)
    if (new Date(at).getHours() % step === 0) ticks.push({ at, label: new Date(at).toLocaleTimeString('en', { hour: 'numeric' }) })
  return ticks
}

const dayTicks = (start: number, end: number): Tick[] => {
  const step = pick(daySteps, end - start, day)
  const first = new Date(start)
  first.setHours(24, 0, 0, 0)
  const ticks: Tick[] = []
  for (const date = first; date.getTime() < end; date.setDate(date.getDate() + step))
    ticks.push({ at: date.getTime(), label: `${date.toLocaleDateString('en', { weekday: 'short' })} ${date.getDate()}` })
  return ticks
}

export const ticksOf = (start: number, end: number) => (end - start <= 2 * day ? hourTicks(start, end) : dayTicks(start, end))
