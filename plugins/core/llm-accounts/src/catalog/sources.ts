import type { SourceInfo } from '../contract'
import type { Accounts } from '../auth/accounts'
import { billings } from '../auth/kinds'
import type { Entry, SourceMeta } from './types'

export const localMeta = (accounts: Accounts, id: string): SourceMeta | undefined => {
  const kind = accounts.kind(id)
  if (!kind || !accounts.signedIn(id)) return undefined
  const plan = accounts.plan(id)
  return { id, kind, label: accounts.label(id), provider: accounts.provider(id), billing: billings[kind], ...(plan && { plan }) }
}

export const localMetas = (accounts: Accounts) => accounts.ids().flatMap(id => localMeta(accounts, id) ?? [])

const searchable = new Set(['openrouter', 'openai'])

export const sourceInfo = ({ meta, models, newModels, checked, error }: Entry): SourceInfo => ({
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
