import { bytes } from '@sand/util'

interface ZipLimits {
  entries: number
  entryBytes: number
  totalBytes: number
}

const MB = 1024 * 1024

const LIMITS: ZipLimits = { entries: 10_000, entryBytes: 64 * MB, totalBytes: 256 * MB }

const damaged = (detail: string) => new Error(`it's damaged: ${detail}`)

const tooManyEntries = (limit: number) => new Error(`it holds more than ${limit.toLocaleString('en')} files`)

const tooLarge = (name: string, size: number, limit: number) => new Error(`${name} unpacks to ${bytes(size)}, more than the ${bytes(limit)} allowed`)

const tooMuch = (limit: number) => new Error(`it unpacks to more than ${bytes(limit)} in all`)

export { LIMITS, damaged, tooLarge, tooManyEntries, tooMuch, type ZipLimits }
