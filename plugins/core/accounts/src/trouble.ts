import { ProviderTrouble } from './contract'
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

export const troubleOf = (provider: string, error: unknown) => {
  if (error instanceof ApiError && busy(error)) return new ProviderTrouble(`${provider} is busy or having trouble (${error.message})`, { cause: error })
  const code = codeOf(error)
  if (code && droppedCodes.has(code)) return new ProviderTrouble(`The connection to ${provider} dropped (${code})`, { cause: error })
  return error
}
