import { coarseDuration, leftOf, percent } from '@sand/util'
import type { LimitWindow } from './models'

export const windowText = (window: LimitWindow) =>
  [`${percent(leftOf(window))} left`, window.resetsAt && `resets in ${coarseDuration(window.resetsAt - Date.now())}`].filter(Boolean).join(' · ')
