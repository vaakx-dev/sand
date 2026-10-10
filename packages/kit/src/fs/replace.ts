import { rename } from 'node:fs/promises'
import { errorCode } from './errors'

const retryable = new Set(['EPERM', 'EACCES', 'EBUSY'])
const attempts = 10

const shouldRetry = (error: unknown, attempt: number) =>
  process.platform === 'win32' && attempt < attempts && retryable.has(errorCode(error) ?? '')

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

export const writeAtomic = async (path: string, text: string) => {
  await Bun.write(`${path}.tmp`, text)
  await replaceFile(`${path}.tmp`, path)
}
