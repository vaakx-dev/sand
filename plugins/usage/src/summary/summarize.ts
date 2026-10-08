import type { LLM, ModelUsage, PeriodUsage, Sessions, SessionSummary, ThreadUsage, UsageQuery, UsageSummary } from '@sand/protocol'
import { periodKey } from './periods'
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
  const total = { ...emptyTotals(), threads: 0 }
  const models = new Map<string, ModelUsage>()
  const periods = new Map<string, PeriodUsage>()
  const threads = new Map<string, ThreadUsage & { agentIds: Set<string> }>()

  const isBranch = (id: string) => infos.get(id)?.kind === 'branch'
  for (const turn of turnsOf(sessions.entriesOfType?.('usage') ?? [], isBranch)) {
    if (turn.at < query.since) continue
    const price = llm?.price?.(turn.model)
    const root = rootOf(turn.session)
    const key = keyOf(turn.at)
    const model = grouped(models, turn.model, () => ({ ...emptyTotals(), model: turn.model, label: labels.get(turn.model) ?? turn.model }))
    const period = grouped(periods, key, () => ({ ...emptyTotals(), key }))
    const thread = grouped(threads, root, () => newThread(root, infos.get(root)))
    for (const totals of [total, model, period, thread]) addUsage(totals, turn.usage, price)
    if (turn.session !== root) thread.agentIds.add(turn.session)
  }

  total.threads = threads.size
  return {
    ...query,
    until: Date.now(),
    total,
    models: [...models.values()].sort(byCost),
    periods: [...periods.values()].sort((a, b) => a.key.localeCompare(b.key)),
    threads: [...threads.values()]
      .sort(byCost)
      .slice(0, topThreads)
      .map(({ agentIds, ...thread }) => ({ ...thread, agents: agentIds.size })),
    ...(llm?.limits?.() && { limits: llm.limits() }),
  }
}
