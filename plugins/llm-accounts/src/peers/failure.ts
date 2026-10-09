import { AccountError, offlineError, rawMessage, refusedError, unsharedError } from '../errors'
import { Offline, Refused } from './http'

export const failure = (pc: string, provider: string, error: unknown) => {
  if (error instanceof Offline) return offlineError(pc, provider, error.message)
  if (!(error instanceof Refused)) return offlineError(pc, provider, rawMessage(error))
  const detail = `HTTP ${error.status} · ${error.message}`
  if (error.status === 401) return refusedError(pc, detail)
  if (error.status === 404) return new AccountError(`${pc} runs an older sand that can't share accounts — update it`, detail)
  if (error.status === 403) return unsharedError(pc, provider, detail)
  return new AccountError(`${pc} couldn't use ${provider}`, detail)
}
