import type { UsageSummary } from '@sand/usage/contract'

const lists = ['accounts', 'models', 'periods', 'projects', 'unpriced']

export const isSummary = (value: unknown): value is UsageSummary => {
  if (!value || typeof value !== 'object' || !('total' in value)) return false
  const fields = new Map(Object.entries<unknown>(value))
  return lists.every(name => Array.isArray(fields.get(name)))
}
