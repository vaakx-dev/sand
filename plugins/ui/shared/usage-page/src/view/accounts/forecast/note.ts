import type { LimitWindow } from '@sand/llm-accounts/contract'
import { coarseDuration, percent } from '@sand/kit'
import { span } from '@vaakx-dev/vrui'
import type { Forecast } from '../../../data/forecast/project'

const tones = {
  warning: 'text-warning-400',
  success: 'text-success-400',
  neutral: 'text-neutral-500',
}

const limitName = (label: string) => {
  const name = label.toLowerCase()
  return name.endsWith('limit') ? name : `${name} limit`
}

const hourText = (at: number) => new Date(at).toLocaleString('en', { weekday: 'short', hour: 'numeric' })

const noteOf = (window: LimitWindow, forecast?: Forecast): [keyof typeof tones, string] => {
  const name = limitName(window.label)
  if (!window.resetsAt) return ['neutral', `The ${name} hasn't started yet.`]
  if (window.used >= 1) return ['warning', `The ${name} is used up until it resets.`]
  if (!forecast) return ['neutral', `There isn't enough usage in sand yet to forecast the ${name}.`]
  if (forecast.outAt)
    return ['warning', `At your usual pace the ${name} runs out ${hourText(forecast.outAt)}, ${coarseDuration(forecast.reset - forecast.outAt)} before it resets.`]
  return ['success', `At your usual pace about ${percent(forecast.leftAtReset)} of the ${name} is left when it resets.`]
}

export const forecastNote = (window: LimitWindow, forecast?: Forecast) => {
  const [tone, text] = noteOf(window, forecast)
  return span({ class: ['text-xs', tones[tone]] }, text)
}
