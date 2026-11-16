import { type LLM, type LLMEvent, type LLMRequest, type ModelInfo, type ProviderInfo, statelessCaps, unavailable } from './contract'
import { heldKey } from './contract/pool'
import type { Accounts } from './auth/accounts'
import type { Catalog } from './catalog'
import { qualify } from './catalog/build'
import { cached } from './catalog/cached'
import { poolEntries } from './catalog/pool'
import { sourceInfo } from './catalog/sources'
import { viewOf } from './catalog/view'
import { watchIdle } from './idle'
import type { LocalLLM } from './local'
import type { Peers, Pin } from './peers/peers'
import { remoteSources } from './peers/sources'

const fallback: ProviderInfo = { id: 'accounts', label: 'Accounts', billing: 'api' }

const remoteIndex = (peers: Peers, accounts: Accounts) => {
  const sources = remoteSources(peers, accounts)
  return {
    sources,
    byId: new Map(sources.map(source => [source.meta.id, source])),
    held: new Set(sources.map(({ meta }) => heldKey(meta.account, meta.pc))),
    prices: new Map(sources.flatMap(source => Object.entries(source.prices))),
  }
}

interface Remote {
  model: ModelInfo
  request: LLMRequest
  movable(): boolean
}

const pinOf = (pc: string | undefined, { request, movable }: Remote): Pin | undefined => {
  if (pc) return { pc, movable }
  const native = request.thread?.native?.pc
  return native ? { pc: native, native: true } : undefined
}

export const mergeLLM = (local: LocalLLM, peers: Peers, accounts: Accounts, catalog: Catalog, idleMs: number) => {
  const remotes = cached(() => remoteIndex(peers, accounts))
  const pooled = cached(() =>
    poolEntries([...local.view.entries(), ...remotes.get().sources.map(({ meta, models }) => catalog.entry(meta, models))], { label: accounts.planLabel, entry: catalog.entry }),
  )
  const view = viewOf(() => pooled.get().entries)

  const remote = async function* (asked: Remote, signal?: AbortSignal): AsyncIterable<LLMEvent> {
    const { model, request } = asked
    const source = remotes.get().byId.get(model.source ?? '')
    if (!source) throw view.missing(model.id)
    const sent = { ...request, model: qualify(source.meta.account, model.name ?? model.id) }
    for await (const event of peers.stream(source.meta.account, sent, signal, pinOf(source.pc, asked))) yield event.type === 'start' ? { ...event, model: model.id } : event
  }

  const borrowed = () => peers.limits().filter(found => remotes.get().held.has(heldKey(found.source, found.pc)))

  const metaOf = (model?: string) => {
    const found = view.resolve(model)
    return found?.source ? view.entry(found.source)?.meta : undefined
  }

  const provider = (model?: string): ProviderInfo => {
    const meta = metaOf(model)
    return meta ? { id: meta.id, label: meta.label, billing: meta.billing, ...(meta.plan && { plan: meta.plan }) } : fallback
  }

  const members = (id: string) => {
    const found = view.find(id)
    return found ? pooled.get().members(found) : []
  }

  const account = (model: ModelInfo, wanted?: string) => {
    const all = pooled.get().members(model)
    const out = unavailable(llm)
    return all.find(member => member.source === wanted) ?? all.find(member => !out.has(member.source ?? '')) ?? all[0] ?? model
  }

  const spare = (model: ModelInfo, chosen: ModelInfo) => {
    const out = unavailable(llm)
    return pooled.get().members(model).some(member => member.source !== chosen.source && !out.has(member.source ?? ''))
  }

  const llm: Required<LLM> = {
    models: view.models,
    find: view.find,
    sources: view.sources,
    accounts: () => pooled.get().accounts.map(sourceInfo),
    members,
    levels: local.levels,
    async *stream(request, signal) {
      await Promise.all([accounts.ready, catalog.ready, peers.ready])
      const model = view.resolve(request.model)
      if (!model?.source) throw view.missing(request.model)
      const chosen = account(model, request.source)
      const movable = () => spare(model, chosen)
      const source = (attempt: AbortSignal) => (chosen.via ? remote({ model: chosen, request, movable }, attempt) : local.stream({ ...request, model: chosen.id }, attempt))
      for await (const event of watchIdle(model.id, idleMs, source, signal)) yield event.type === 'start' ? { ...event, model: model.id } : event
    },
    provider,
    limits: () => local.limits() ?? borrowed()[0],
    sourceLimits: () => [...local.allLimits(), ...borrowed()],
    refreshLimits: async () => {
      const [own] = await Promise.all([local.refreshLimits(), peers.refresh(true)])
      return own ?? borrowed()[0]
    },
    price: model => {
      const id = view.find(model)?.id ?? model
      return catalog.price(id) ?? remotes.get().prices.get(id)
    },
    caps: model => metaOf(model)?.caps ?? statelessCaps(),
    release: local.release,
  }

  const reset = () => {
    remotes.reset()
    pooled.reset()
    view.reset()
  }
  return { llm, view, reset }
}
