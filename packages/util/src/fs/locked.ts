import { errorCode } from './errors'

const retryable = new Set(['EPERM', 'EACCES', 'EBUSY'])
const attempts = 15

const shouldRetry = (error: unknown, attempt: number) =>
  process.platform === 'win32' && attempt < attempts && retryable.has(errorCode(error) ?? '')

export const retryLocked = async <T>(work: () => Promise<T>): Promise<T> => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await work()
    } catch (error) {
      if (!shouldRetry(error, attempt)) throw error
      await Bun.sleep(attempt * 20)
    }
  }
}
