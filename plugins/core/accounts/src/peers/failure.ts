import { AccountError, rawMessage } from '../errors'
import { Refused } from './refused'

const refusedText = (error: Refused, pc: string, provider: string) => {
  if (error.status === 401) return `${pc} no longer accepts this PC — pair it again`
  if (error.status === 403) return `${pc} doesn't share ${provider} anymore`
  return `${pc} couldn't use ${provider}`
}

export const failure = (pc: string, provider: string, error: unknown) => {
  if (error instanceof Refused) return new AccountError(refusedText(error, pc, provider), `HTTP ${error.status} · ${error.message}`)
  return new AccountError(`${pc} is offline, so ${provider} isn't available`, rawMessage(error))
}
