import { isRecord } from '@sand/kit'

export const nonEmpty = (value: unknown) => (typeof value === 'string' && value ? value : undefined)

export const positive = (value: unknown) => (typeof value === 'number' && value > 0 ? value : undefined)

export const listIn = (source: string, body: unknown, key: string): unknown[] => {
  const list = isRecord(body) ? body[key] : undefined
  if (!Array.isArray(list)) throw new Error(`${source} model list failed: unexpected answer`)
  return list
}
