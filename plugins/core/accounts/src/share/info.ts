import { wireEvent } from '@sand/host-hub/contract'
import type { AccountKind, Limits, LLMEvent, LoginAccount, LoginMethod, ModelInfo, ModelPrice, ProviderCapabilities } from '../contract'
import type { Accounts } from '../auth/accounts'
import type { PriceList, UserPrices } from '../catalog/prices'
import type { LocalLLM } from '../local'

export const sharePaths = { info: '/llm/share/info', stream: '/llm/share/stream' } as const

export const shareChange = wireEvent<void>('share.change')

export interface SharedAccount {
  id: string
  kind: AccountKind
  provider: string
  label: string
  method: LoginMethod
  plan?: string
  email?: string
  caps?: ProviderCapabilities
}

export interface ShareInfo {
  accounts: SharedAccount[]
  models: ModelInfo[]
  prices: Record<string, ModelPrice>
  userPrices?: UserPrices
  limits: Limits[]
}

export type ShareFailure = 'lost' | 'trouble' | 'limited' | 'rejected'

export type ShareLine = LLMEvent | { type: 'ping' } | { type: 'error'; message: string; detail?: string; kind?: ShareFailure; waitMs?: number; resetsAt?: number }

export const sharedIds = (accounts: Accounts) => accounts.ids().filter(accounts.shared)

const shareable = ({ id, kind, provider, label, method, plan, email }: LoginAccount, caps?: ProviderCapabilities): SharedAccount[] =>
  method ? [{ id, kind, provider, label, method, ...(plan && { plan }), ...(email && { email }), ...(caps && { caps }) }] : []

export const shareInfo = (local: LocalLLM, accounts: Accounts, userPrices: PriceList): ShareInfo => {
  const shared = new Set(sharedIds(accounts))
  const models = local.models().filter(model => shared.has(model.source ?? ''))
  const prices = Object.fromEntries(
    models.flatMap(model => {
      const price = local.price(model.id)
      return price ? [[model.id, price] as const] : []
    }),
  )
  const list = accounts.list().flatMap(found => (shared.has(found.id) ? shareable(found, local.view.entry(found.id)?.meta.caps) : []))
  const limits = local.allLimits().filter(found => shared.has(found.source))
  return { accounts: list, models, prices, userPrices: userPrices.own(), limits }
}
