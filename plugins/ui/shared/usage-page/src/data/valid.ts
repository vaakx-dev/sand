import type { UsageSummary } from '@sand/usage/contract'

const lists = ['accounts', 'models', 'periods', 'threads', 'projects', 'unpriced']

const hasSource = (account: unknown) => !!account && typeof account === 'object' && 'source' in account && typeof account.source === 'string'

export const isSummary = (value: unknown): value is UsageSummary => {
  if (!value || typeof value !== 'object' || !('total' in value)) return false
  const fields = new Map(Object.entries<unknown>(value))
  const accounts = fields.get('accounts')
  return lists.every(name => Array.isArray(fields.get(name))) && Array.isArray(accounts) && accounts.every(hasSource)
}
