import { errorCode } from './errors'

const retryable = new Set(['EPERM', 'EACCES', 'EBUSY'])
const ATTEMPTS = 15
const BACKOFF_MS = 20

const shouldRetry = (error: unknown, attempt: number, attempts: number) =>
  process.platform === 'win32' && attempt < attempts && retryable.has(errorCode(error) ?? '')

export const retryLocked = async <T>(work: () => Promise<T>, attempts = ATTEMPTS): Promise<T> => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await work()
    } catch (error) {
      if (!shouldRetry(error, attempt, attempts)) throw error
      await Bun.sleep(attempt * BACKOFF_MS)
    }
  }
}
