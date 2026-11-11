import { isRecord } from '../json/record'

export const wellFormed = <T>(value: T): T => {
  if (typeof value === 'string') return value.toWellFormed() as T
  if (Array.isArray(value)) return value.map(wellFormed) as T
  if (isRecord(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, wellFormed(item)])) as T
  return value
}
