class ProviderTrouble extends Error {
  override name = 'ProviderTrouble'

  constructor(
    message: string,
    readonly waitMs?: number,
    options?: ErrorOptions,
  ) {
    super(message, options)
  }
}

const RATE_LIMITED = 429
const SERVER_ERROR = 500
const BUSY_STATUSES = new Set([408, 409, RATE_LIMITED])

const DROPPED_CODES = [
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
]

const busyStatus = (status: number) => BUSY_STATUSES.has(status) || status >= SERVER_ERROR

export { busyStatus, DROPPED_CODES, ProviderTrouble, RATE_LIMITED }
