import type { AccountKind, EffortLevel, Limits, LLMEvent, LoginAccount, LoginMethod, ModelInfo, ModelPrice } from '../contract'
import type { Accounts } from '../auth/accounts'
import type { LocalLLM } from '../local'

export const sharePaths = { info: '/llm/share/info', stream: '/llm/share/stream' } as const

export interface SharedAccount {
  id: string
  kind: AccountKind
  provider: string
  label: string
  method: LoginMethod
  plan?: string
}

export interface ShareInfo {
  accounts: SharedAccount[]
  models: ModelInfo[]
  levels: EffortLevel[]
  prices: Record<string, ModelPrice>
  limits?: Limits
}

export type ShareLine = LLMEvent | { type: 'ping' } | { type: 'error'; message: string; detail?: string }

export const sharedIds = (accounts: Accounts) => accounts.ids().filter(accounts.shared)

const shareable = ({ id, kind, provider, label, method, plan }: LoginAccount): SharedAccount[] =>
  method ? [{ id, kind, provider, label, method, ...(plan && { plan }) }] : []

export const shareInfo = (local: LocalLLM, accounts: Accounts): ShareInfo => {
  const shared = new Set(sharedIds(accounts))
  const models = local.models().filter(model => shared.has(model.source ?? ''))
  const prices = Object.fromEntries(
    models.flatMap(model => {
      const price = local.price(model.id)
      return price ? [[model.id, price] as const] : []
    }),
  )
  const list = accounts.list().flatMap(found => (shared.has(found.id) ? shareable(found) : []))
  const limits = local.allLimits().find(found => shared.has(found.source))
  return { accounts: list, models, levels: local.levels(), prices, ...(limits && { limits }) }
}
