import type { EffortLevel, Limits, LLMEvent, LLMRequest, ModelInfo, ModelPrice } from './contract'
import type { Accounts } from './auth/accounts'
import { signInError } from './auth/kinds'
import type { Catalog } from './catalog'
import type { SourceMeta } from './catalog/types'
import { viewOf } from './catalog/view'
import type { CompatTarget } from './compat/client'

export const levels: EffortLevel[] = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
  { id: 'xhigh', label: 'Extra high' },
  { id: 'max', label: 'Max' },
]

type Stream = (account: string, request: LLMRequest, signal?: AbortSignal) => AsyncIterable<LLMEvent>

export interface Routes {
  accounts: Accounts
  catalog: Catalog
  claude: { stream: Stream; probe(): Promise<void> }
  codex: { stream: Stream }
  compat: { stream(target: CompatTarget, request: LLMRequest, signal?: AbortSignal): AsyncIterable<LLMEvent> }
  limits(): Limits | undefined
}

const openRouterBase = 'https://openrouter.ai/api/v1'

export type LocalLLM = ReturnType<typeof createLocal>

export const createLocal = ({ accounts, catalog, claude, codex, compat, limits }: Routes) => {
  const view = viewOf(catalog.entries)

  const target = async (meta: SourceMeta, model: ModelInfo, name: string): Promise<CompatTarget> => {
    const common = { model: name, name: meta.label, reasoning: model.efforts.length > 0, images: !!model.images }
    if (meta.kind === 'server') {
      const server = accounts.server(meta.id)
      if (!server) throw signInError(meta.label)
      return { ...common, base: server.url, ...(server.key && { key: server.key }) }
    }
    const credential = await accounts.auth(meta.id)
    if (credential.type !== 'api_key') throw signInError(meta.label)
    return { ...common, base: credential.base_url ?? openRouterBase, key: credential.key }
  }

  const route = async function* (meta: SourceMeta, model: ModelInfo, request: LLMRequest, signal?: AbortSignal): AsyncIterable<LLMEvent> {
    const name = model.name ?? model.id
    const sent = { ...request, model: name }
    if (meta.kind === 'claude' || meta.kind === 'anthropic') yield* claude.stream(meta.id, sent, signal)
    else if (meta.kind === 'codex' || meta.kind === 'openai') yield* codex.stream(meta.id, sent, signal)
    else yield* compat.stream(await target(meta, model, name), sent, signal)
  }

  return {
    view,
    models: view.models,
    find: view.find,
    levels: () => levels,
    async *stream(request: LLMRequest, signal?: AbortSignal): AsyncIterable<LLMEvent> {
      await Promise.all([accounts.ready, catalog.ready])
      const model = view.resolve(request.model)
      const meta = model?.source ? view.entry(model.source)?.meta : undefined
      if (!model || !meta) throw view.missing(request.model)
      for await (const event of route(meta, model, request, signal)) yield event.type === 'start' ? { ...event, model: model.id } : event
    },
    limits,
    price: (model: string): ModelPrice | undefined => catalog.price(view.find(model)?.id ?? model),
    async refreshLimits() {
      await accounts.ready
      if (accounts.signedIn('claude')) await claude.probe()
      return limits()
    },
  }
}
