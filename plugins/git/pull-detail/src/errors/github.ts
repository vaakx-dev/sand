import { errorMessage, isRecord } from '@sand/util'

const saidPrefix = /^GitHub said:\s*/

export const statusOf = (error: unknown) => (isRecord(error) && typeof error.status === 'number' ? error.status : undefined)

export const kindOf = (error: unknown) => (isRecord(error) && typeof error.kind === 'string' ? error.kind : undefined)

export const saidBy = (error: unknown) => {
  const message = errorMessage(error)
  return saidPrefix.test(message) ? message.replace(saidPrefix, '').replace(/\.$/, '') : undefined
}

export const isMissing = (error: unknown) => kindOf(error) === 'NOT_FOUND' || statusOf(error) === 404

export const isForbidden = (error: unknown) => kindOf(error) === 'FORBIDDEN' || statusOf(error) === 403
