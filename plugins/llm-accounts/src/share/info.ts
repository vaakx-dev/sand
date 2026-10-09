import type { EffortLevel, LLMEvent, Limits, LoginMethod, LoginProvider, ModelInfo, ModelPrice } from '@sand/protocol'
import { providers, type Accounts } from '../auth/accounts'
import type { LocalLLM } from '../local'

export const sharePaths = { info: '/llm/share/info', stream: '/llm/share/stream' } as const

export interface SharedAccount {
  provider: LoginProvider
  label: string
  subscription: string
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

export const sharedProviders = (accounts: Accounts) => providers.filter(accounts.shared)

export const shareInfo = (local: LocalLLM, accounts: Accounts): ShareInfo => {
  const shared = new Set(sharedProviders(accounts))
  const models = local.models().filter(model => shared.has(model.provider as LoginProvider))
  const prices = Object.fromEntries(
    models.flatMap(model => {
      const price = local.price(model.id)
      return price ? [[model.id, price] as const] : []
    }),
  )
  const list = accounts.list().flatMap(({ provider, label, subscription, method, plan }) =>
    shared.has(provider) && method ? [{ provider, label, subscription, method, ...(plan && { plan }) }] : [],
  )
  const limits = shared.has('anthropic') ? local.limits() : undefined
  return { accounts: list, models, levels: local.levels(), prices, ...(limits && { limits }) }
}
