import type { UsageSummary } from '@sand/usage/contract'

const lists = ['accounts', 'models', 'periods', 'threads', 'projects', 'unpriced'] as const

const hasSources = (accounts: unknown[]) => accounts.every(account => typeof (account as { source?: unknown })?.source === 'string')

export const isSummary = (value: unknown): value is UsageSummary => {
  if (!value || typeof value !== 'object' || !('total' in value)) return false
  const record = value as Record<string, unknown>
  return lists.every(name => Array.isArray(record[name])) && hasSources(record.accounts as unknown[])
}
