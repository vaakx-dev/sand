import { ProviderTrouble, UsageLimited } from './contract'
import { ApiError } from './http/error'

const droppedCodes = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ECONNABORTED',
  'EPIPE',
  'ETIMEDOUT',
  'ENETUNREACH',
  'EHOSTUNREACH',
  'EAI_AGAIN',
  'ConnectionClosed',
  'ConnectionRefused',
  'FailedToOpenSocket',
])
const busyStreamErrors = new Set(['overloaded_error', 'api_error'])
const busyStatuses = new Set([408, 409])

const codeOf = (error: unknown): string | undefined => {
  if (!(error instanceof Error)) return undefined
  const code = 'code' in error ? error.code : undefined
  return typeof code === 'string' ? code : codeOf(error.cause)
}

const busy = ({ status, type }: ApiError) => (status === undefined ? busyStreamErrors.has(type) : busyStatuses.has(status) || status >= 500)

const apiTrouble = (provider: string, error: ApiError) => {
  if (error.usageLimit) return new UsageLimited(`${provider} is out of usage (${error.message})`, error.resetsAt)
  if (error.status === 429) return new ProviderTrouble(`${provider} is rate limiting sand (${error.message})`, error.waitMs, { cause: error })
  if (busy(error)) return new ProviderTrouble(`${provider} is busy or having trouble (${error.message})`, error.waitMs, { cause: error })
  return error
}

export const troubleOf = (provider: string, error: unknown) => {
  if (error instanceof ApiError) return apiTrouble(provider, error)
  const code = codeOf(error)
  if (code && droppedCodes.has(code)) return new ProviderTrouble(`The connection to ${provider} dropped (${code})`, undefined, { cause: error })
  return error
}
