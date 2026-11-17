import { z } from 'zod'

const fields = z.record(z.string(), z.unknown())

export const wellFormed = <T>(value: T): T => {
  if (typeof value === 'string') return value.toWellFormed() as T
  if (Array.isArray(value)) return value.map(wellFormed) as T
  const record = fields.safeParse(value)
  if (record.success) return Object.fromEntries(Object.entries(record.data).map(([key, item]) => [key, wellFormed(item)])) as T
  return value
}
