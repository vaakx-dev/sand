import type { Billing, LLM, ProviderInfo } from '@sand/llm-accounts/contract'
import type { Turn } from './turns'

const unknown = 'unknown'

const titled = (id: string) => (id === unknown ? 'Other' : id.charAt(0).toUpperCase() + id.slice(1))

export const isBilled = (billing: Billing) => billing === 'api' || billing === 'credits'

export const providerResolver = (llm: LLM | undefined) => {
  const current = llm?.provider?.()
  const owners = new Map((llm?.models?.() ?? []).flatMap(model => (model.provider ? [[model.id, model.provider] as const] : [])))
  const infoOf = (id: string): ProviderInfo => (id === current?.id ? current : { id, label: titled(id), billing: 'api' })
  const idOf = (turn: Turn) => turn.provider ?? owners.get(turn.model) ?? current?.id ?? unknown
  const billingOf = (turn: Turn, id: string): Billing => turn.billing ?? infoOf(id).billing
  return { current, infoOf, idOf, billingOf }
}
