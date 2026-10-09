import { rename } from 'node:fs/promises'

const retryable = new Set(['EPERM', 'EACCES', 'EBUSY'])
const attempts = 10

const shouldRetry = (error: unknown, attempt: number) =>
  process.platform === 'win32' &&
  attempt < attempts &&
  retryable.has((error as NodeJS.ErrnoException)?.code ?? '')

export const replaceFile = async (from: string, to: string): Promise<void> => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await rename(from, to)
    } catch (error) {
      if (!shouldRetry(error, attempt)) throw error
      await Bun.sleep(attempt * 20)
    }
  }
}
