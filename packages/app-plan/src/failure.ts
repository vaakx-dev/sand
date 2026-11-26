import { busyStatus, DROPPED_CODES, type PlanLimits, ProviderTrouble, UsageLimited } from '@sand/accounts/contract'
import { resetOf, spent } from './limits'

interface Limited {
  resetsAt?: number
}

interface Failure {
  message: string
  status?: number | 'dropped'
  limited?: Limited
  limits?: PlanLimits
}

const DROPPED_TEXT = /connection (error|reset|refused|closed)|socket hang up|network error|fetch failed|timed out|deadline exceeded/i

const droppedText = (message: string) => DROPPED_TEXT.test(message) || DROPPED_CODES.some(code => message.includes(code))

const transient = ({ message, status }: Failure) => {
  if (status === 'dropped') return true
  if (status !== undefined) return busyStatus(status)
  return droppedText(message)
}

const appFailure = (failure: Failure): Error => {
  const { message, limited, limits } = failure
  if (limited || spent(limits)) return new UsageLimited(message, limited?.resetsAt ?? resetOf(limits))
  if (transient(failure)) return new ProviderTrouble(message)
  return new Error(message)
}

export { appFailure, type Failure }
