import type { LimitWindow } from '@sand/accounts/contract'
import { percent } from '@sand/util'
import { span } from '@vaakx-dev/vrui'
import type { Forecast } from '../../../data/forecast/project'

const limitName = (label: string) => {
  const name = label.toLowerCase()
  return name.endsWith('limit') ? name : `${name} limit`
}

export const hourText = (at: number) => new Date(at).toLocaleString('en', { weekday: 'short', hour: 'numeric' })

const missingText = (window: LimitWindow) => {
  const name = limitName(window.label)
  if (!window.resetsAt) return `The ${name} hasn't started yet.`
  if (window.used >= 1) return `The ${name} is used up until it resets.`
  return `There isn't enough usage in sand yet to forecast the ${name}.`
}

export const missingNote = (window: LimitWindow) => span({ class: 'text-sm text-neutral-400' }, missingText(window))

export const verdict = (forecast: Forecast) =>
  forecast.outAt
    ? span({ class: 'text-warning-400' }, `runs out ${hourText(forecast.outAt)}`)
    : span(`about ${percent(forecast.leftAtReset)} left at reset`)
