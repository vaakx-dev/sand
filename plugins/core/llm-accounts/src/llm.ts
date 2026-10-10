import type { LLM, LLMEvent, LLMRequest, ModelInfo, ProviderInfo } from './contract'
import type { Accounts } from './auth/accounts'
import type { Catalog } from './catalog'
import { qualify } from './catalog/build'
import { cached } from './catalog/cached'
import { viewOf } from './catalog/view'
import type { LocalLLM } from './local'
import type { Peers } from './peers/peers'
import { remoteSources } from './peers/sources'

const fallback: ProviderInfo = { id: 'accounts', label: 'Accounts', billing: 'api' }

const remoteIndex = (peers: Peers, accounts: Accounts) => {
  const sources = remoteSources(peers, accounts)
  return {
    sources,
    byId: new Map(sources.map(source => [source.meta.id, source])),
    prices: new Map(sources.flatMap(source => Object.entries(source.prices))),
  }
}

export const mergeLLM = (local: LocalLLM, peers: Peers, accounts: Accounts, catalog: Catalog) => {
  const remotes = cached(() => remoteIndex(peers, accounts))
  const view = viewOf(() => [...local.view.entries(), ...remotes.get().sources.map(({ meta, models }) => catalog.entry(meta, models))])

  const remote = async function* (model: ModelInfo, request: LLMRequest, signal?: AbortSignal): AsyncIterable<LLMEvent> {
    const source = remotes.get().byId.get(model.source ?? '')
    if (!source) throw view.missing(model.id)
    const sent = { ...request, model: qualify(source.account, model.name ?? model.id) }
    for await (const event of peers.stream(source.account, sent, signal, source.pc)) yield event.type === 'start' ? { ...event, model: model.id } : event
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
      if (model.via) yield* remote(model, request, signal)
      else yield* local.stream({ ...request, model: model.id }, signal)
    },
    provider,
    limits: () => (accounts.signedIn('claude') ? local.limits() : peers.limits()) ?? local.limits('codex'),
    sourceLimits: () => {
      const borrowed = accounts.signedIn('claude') ? undefined : peers.limits()
      return [...local.allLimits(), ...(borrowed ? [borrowed] : [])]
    },
    refreshLimits: async () => {
      if (accounts.signedIn('claude')) return local.refreshLimits()
      await peers.refresh(true)
      return peers.limits()
    },
    price: model => {
      const id = view.find(model)?.id ?? model
      return catalog.price(id) ?? remotes.get().prices.get(id)
    },
  }

  const reset = () => {
    remotes.reset()
    view.reset()
  }
  return { llm, view, reset }
}
