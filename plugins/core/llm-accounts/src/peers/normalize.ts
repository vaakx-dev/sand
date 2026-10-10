import type { ModelInfo, ModelPrice } from '../contract'
import { fixedLabels, legacyId } from '../auth/kinds'
import type { SharedAccount } from '../share/info'
import type { CachedInfo } from './cache'

type RawAccount = Omit<SharedAccount, 'id' | 'kind'> & Partial<Pick<SharedAccount, 'id' | 'kind'>>

const account = (raw: RawAccount): SharedAccount => {
  if (raw.id && raw.kind) return raw as SharedAccount
  const id = legacyId(raw.provider, raw.method)
  return { ...raw, id, kind: id, label: fixedLabels[id] }
}

const qualified = (accounts: SharedAccount[], prices: Record<string, ModelPrice>) => (model: ModelInfo) => {
  if (model.source) return [{ model, price: prices[model.id] }]
  const owner = accounts.find(found => found.provider === model.provider)
  if (!owner) return []
  const id = `${owner.id}/${model.id}`
  return [{ model: { ...model, id, source: owner.id, name: model.id }, price: prices[model.id] }]
}

export const normalize = (info: CachedInfo): CachedInfo => {
  const raw = info.accounts as RawAccount[]
  if (raw.every(found => found.id && found.kind) && info.models.every(model => model.source)) return info
  const accounts = raw.map(account)
  const models = info.models.flatMap(qualified(accounts, info.prices ?? {}))
  return {
    ...info,
    accounts,
    models: models.map(found => found.model),
    prices: Object.fromEntries(models.flatMap(found => (found.price ? [[found.model.id, found.price]] : []))),
    legacy: true,
  }
}

export const bareName = (info: CachedInfo | undefined, account: string, model: string | undefined) =>
  info?.legacy && model?.startsWith(`${account}/`) ? model.slice(account.length + 1) : model
