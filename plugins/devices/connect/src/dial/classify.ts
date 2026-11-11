import { type AttemptResult, isPcUnavailable } from '@sand/devices-contract'
import { isTimeout } from '../errors/timed-out'
import { AccessRefused } from '../errors/access-refused'
import { Unreachable } from '../errors/unreachable'

export const attemptResultOf = (error: unknown): AttemptResult => {
  if (isTimeout(error)) return 'timeout'
  if (error instanceof AccessRefused) return 'not-allowed'
  if (error instanceof Unreachable || isPcUnavailable(error)) return 'refused'
  return 'error'
}
