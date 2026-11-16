import type { UsageHistory, UsageSummary } from '@sand/usage/contract'

const lists = ['accounts', 'models', 'periods', 'projects', 'unpriced']

const fieldsOf = (value: unknown) => new Map<string, unknown>(value && typeof value === 'object' ? Object.entries(value) : [])

const records = (value: unknown, field: string) => Array.isArray(value) && value.every(item => typeof item === 'object' && item && field in item)

export const isSummary = (value: unknown): value is UsageSummary => {
  const fields = fieldsOf(value)
  return fields.has('total') && lists.every(name => Array.isArray(fields.get(name))) && records(fields.get('periods'), 'models')
}

export const isHistory = (value: unknown): value is UsageHistory => {
  const fields = fieldsOf(value)
  return typeof fields.get('since') === 'number' && Array.isArray(fields.get('accounts')) && records(fields.get('periods'), 'accounts') && !records(fields.get('periods'), 'models')
}
