import type { SourceInfo, SourceRef } from '../contract'
import type { Accounts } from '../auth/accounts'
import { billingOf } from '../auth/kinds'
import type { Entry, SourceMeta } from './types'

export const localMeta = (accounts: Accounts, id: string): SourceMeta | undefined => {
  const kind = accounts.kind(id)
  const method = accounts.method(id)
  if (!kind || !method) return undefined
  const plan = accounts.plan(id)
  const api = accounts.api(id)
  return { id, kind, label: accounts.label(id), provider: accounts.provider(id), billing: billingOf(method), ...(api && { api }), ...(plan && { plan }) }
}

export const localMetas = (accounts: Accounts) => accounts.ids().flatMap(id => localMeta(accounts, id) ?? [])

export const sourceRef = ({ id, label, provider, billing, plan }: SourceMeta): SourceRef => ({ source: id, label, provider, billing, ...(plan && { plan }) })

const searchable = new Set(['openrouter', 'openai'])

export const sourceInfo = ({ meta: { api: _, ...meta }, models, newModels, checked, error }: Entry): SourceInfo => ({
  ...meta,
  shown: models.filter(model => !model.hidden).length,
  total: models.length,
  fresh: models.filter(model => model.fresh).length,
  newModels,
  search: searchable.has(meta.kind),
  slugs: true,
  ...(checked && { checked }),
  ...(error && { error }),
})
