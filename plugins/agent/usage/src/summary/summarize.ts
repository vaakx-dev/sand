import type { LLM } from '@sand/llm-accounts/contract'
import type { Sessions, SessionSummary } from '@sand/sessions-sqlite/contract'
import type { ModelUsage, PeriodUsage, ProviderUsage, ThreadUsage, UsageQuery, UsageSummary } from '../contract'
import { periodKey } from './periods'
import { isBilled, providerResolver } from './providers'
import { addUsage, byCost, emptyTotals } from './totals'
import { turnsOf } from './turns'

const topThreads = 10

export interface UsageSources {
  sessions: Sessions
  llm?: LLM
}

const rootFinder = (infos: Map<string, SessionSummary>) => (id: string) => {
  let info = infos.get(id)
  while (info?.kind === 'agent' && info.parent && infos.has(info.parent)) info = infos.get(info.parent)
  return info?.id ?? id
}

const newThread = (id: string, info?: SessionSummary) => ({
  ...emptyTotals(),
  id,
  title: info?.title ?? null,
  cwd: info?.cwd ?? '',
  agents: 0,
  agentIds: new Set<string>(),
})

const grouped = <T>(map: Map<string, T>, key: string, make: () => T) => {
  const found = map.get(key)
  if (found) return found
  const made = make()
  map.set(key, made)
  return made
}

export const summarize = ({ sessions, llm }: UsageSources, query: UsageQuery): UsageSummary => {
  const infos = new Map(sessions.list().map(info => [info.id, info]))
  const rootOf = rootFinder(infos)
  const keyOf = periodKey(query.zone, query.bucket)
  const labels = new Map((llm?.models?.() ?? []).map(model => [model.id, model.label]))
  const resolve = providerResolver(llm)
  const total = { ...emptyTotals(), threads: 0 }
  const providers = new Map<string, ProviderUsage & { roots: Set<string> }>()
  const models = new Map<string, ModelUsage>()
  const periods = new Map<string, PeriodUsage>()
  const threads = new Map<string, ThreadUsage & { agentIds: Set<string> }>()
  const providerOf = (id: string) => grouped(providers, id, () => ({ ...emptyTotals(), ...resolve.infoOf(id), threads: 0, roots: new Set<string>() }))
  if (resolve.current) providerOf(resolve.current.id)

  const isBranch = (id: string) => infos.get(id)?.kind === 'branch'
  for (const turn of turnsOf(sessions.entriesOfType?.('usage') ?? [], isBranch)) {
    if (turn.at < query.since) continue
    const price = llm?.price?.(turn.model)
    const root = rootOf(turn.session)
    const key = keyOf(turn.at)
    const providerId = resolve.idOf(turn)
    const billed = isBilled(resolve.billingOf(turn, providerId))
    const provider = providerOf(providerId)
    const model = grouped(models, `${providerId}:${turn.model}`, () => ({
      ...emptyTotals(),
      model: turn.model,
      label: labels.get(turn.model) ?? turn.model,
      provider: providerId,
    }))
    const period = grouped(periods, key, (): PeriodUsage => ({ ...emptyTotals(), key, providers: {} }))
    const periodProvider = (period.providers[providerId] ??= emptyTotals())
    const thread = grouped(threads, root, () => newThread(root, infos.get(root)))
    for (const totals of [total, provider, model, period, periodProvider, thread]) addUsage(totals, turn.usage, price, billed)
    provider.roots.add(root)
    if (turn.session !== root) thread.agentIds.add(turn.session)
  }

  const limits = llm?.limits?.()
  const limitsOwner = limits && (limits.provider ?? resolve.current?.id)
  total.threads = threads.size
  return {
    ...query,
    until: Date.now(),
    total,
    providers: [...providers.values()]
      .sort(byCost)
      .map(({ roots, ...provider }) => ({ ...provider, threads: roots.size, ...(provider.id === limitsOwner && { limits }) })),
    models: [...models.values()].sort(byCost),
    periods: [...periods.values()].sort((a, b) => a.key.localeCompare(b.key)),
    threads: [...threads.values()]
      .sort(byCost)
      .slice(0, topThreads)
      .map(({ agentIds, ...thread }) => ({ ...thread, agents: agentIds.size })),
    ...(limits && { limits }),
  }
}
