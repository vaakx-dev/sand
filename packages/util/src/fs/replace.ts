import { rename } from 'node:fs/promises'
import { retryLocked } from './locked'

const FRESH_ATTEMPTS = 30

export const replaceFile = (from: string, to: string) => retryLocked(() => rename(from, to))

export const moveFresh = (from: string, to: string) => retryLocked(() => rename(from, to), FRESH_ATTEMPTS)

export const writeAtomic = async (path: string, data: string | Uint8Array) => {
  const temp = `${path}.${Bun.randomUUIDv7()}.tmp`
  await Bun.write(temp, data)
  await replaceFile(temp, path)
}
