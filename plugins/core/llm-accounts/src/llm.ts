import type { LLM, LLMEvent, LLMRequest, ProviderInfo } from './contract'
import type { Accounts } from './auth/accounts'
import type { Catalog } from './catalog'
import { viewOf } from './catalog/view'
import type { LocalLLM } from './local'
import type { Peers } from './peers/peers'
import { remoteSources } from './peers/sources'

const fallback: ProviderInfo = { id: 'accounts', label: 'Accounts', billing: 'api' }

export const mergeLLM = (local: LocalLLM, peers: Peers, accounts: Accounts, catalog: Catalog) => {
  const view = viewOf(() => [...catalog.entries(), ...remoteSources(peers, accounts).map(({ meta, models }) => catalog.entry(meta, models))])

  const remote = async function* (source: string, id: string, request: LLMRequest, signal?: AbortSignal): AsyncIterable<LLMEvent> {
    for await (const event of peers.stream(source, { ...request, model: id }, signal)) yield event.type === 'start' ? { ...event, model: id } : event
  }

  const provider = (model?: string): ProviderInfo => {
    const found = view.resolve(model)
    const meta = found?.source ? view.entry(found.source)?.meta : undefined
    return meta ? { id: meta.id, label: meta.label, billing: meta.billing, ...(meta.plan && { plan: meta.plan }) } : fallback
  }

  const llm: Required<LLM> = {
    models: view.models,
    find: view.find,
    sources: view.sources,
    levels: () => local.levels(),
    async *stream(request, signal) {
      await Promise.all([accounts.ready, catalog.ready, peers.ready])
      const model = view.resolve(request.model)
      if (!model?.source) throw view.missing(request.model)
      if (model.via) yield* remote(model.source, model.id, request, signal)
      else yield* local.stream({ ...request, model: model.id }, signal)
    },
    provider,
    limits: () => (accounts.signedIn('claude') ? local.limits() : peers.limits()),
    refreshLimits: async () => {
      if (accounts.signedIn('claude')) return local.refreshLimits()
      await peers.refresh(true)
      return peers.limits()
    },
    price: model => {
      const id = view.find(model)?.id ?? model
      return local.price(id) ?? peers.price(id)
    },
  }
  return { llm, view }
}
