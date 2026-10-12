import type { EffortLevel, LLMEvent, LLMRequest, ModelInfo, ModelPrice } from './contract'
import type { Accounts } from './auth/accounts'
import { signInError } from './auth/kinds'
import type { PlanRegistry } from './auth/plans'
import type { Catalog } from './catalog'
import { sourceRef } from './catalog/sources'
import type { SourceMeta } from './catalog/types'
import { viewOf } from './catalog/view'
import type { Claude } from './claude/client'
import type { Compat } from './compat/client'
import type { CompatTarget } from './compat/target'
import type { LimitStore } from './limits'
import type { OpenAI } from './openai/client'

const levels: EffortLevel[] = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
  { id: 'xhigh', label: 'Extra high' },
  { id: 'max', label: 'Max' },
]

const openRouterBase = 'https://openrouter.ai/api/v1'

interface LocalOptions {
  accounts: Accounts
  plans: PlanRegistry
  catalog: Catalog
  claude: Claude
  openai: OpenAI
  compat: Compat
  limits: LimitStore
}

export type LocalLLM = ReturnType<typeof createLocal>

export const createLocal = ({ accounts, plans, catalog, claude, openai, compat, limits }: LocalOptions) => {
  const view = viewOf(catalog.entries)
  const signedInPlans = () => plans.list().filter(plan => accounts.signedIn(plan.id))
  const allLimits = () => Object.values(limits.all()).filter(found => accounts.signedIn(found.source))
  const firstLimits = () => signedInPlans().flatMap(plan => limits.all()[plan.id] ?? [])[0]

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
    if (meta.api === 'anthropic') yield* claude.stream(meta.id, sent, signal)
    else if (meta.api === 'openai') yield* openai.stream(meta.id, sent, signal)
    else yield* compat.stream(await target(meta, model, name), sent, signal)
  }

  const checkUsage = async () => {
    for (const plan of signedInPlans()) {
      if (!plan.usage) continue
      const credential = await accounts.auth(plan.id)
      if (credential.type === 'oauth') limits.save(plan.id, await plan.usage(credential))
    }
  }

  return {
    view,
    models: view.models,
    levels: () => levels,
    async *stream(request: LLMRequest, signal?: AbortSignal): AsyncIterable<LLMEvent> {
      await Promise.all([accounts.ready, catalog.ready])
      const model = view.resolve(request.model)
      const meta = model?.source ? view.entry(model.source)?.meta : undefined
      if (!model || !meta) throw view.missing(request.model)
      const source = sourceRef(meta)
      for await (const event of route(meta, model, request, signal)) {
        if (event.type === 'start') yield { ...event, model: model.id }
        else yield event.type === 'done' ? { ...event, source } : event
      }
    },
    limits: firstLimits,
    allLimits,
    price: (model: string): ModelPrice | undefined => catalog.price(view.find(model)?.id ?? model),
    async refreshLimits() {
      await accounts.ready
      await checkUsage()
      return firstLimits()
    },
  }
}
