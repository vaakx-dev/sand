import type { LLM } from '@sand/llm-accounts/contract'
import type { Sessions } from '@sand/sessions-sqlite/contract'
import type { UsageQuery, UsageSummary } from '../contract'
import { accountBook } from './accounts'
import { identityResolver } from './identity'
import { modelBook } from './models'
import { periodBook } from './periods'
import { rootFinder, threadBook } from './threads'
import { addUsage, emptyTotals, isBilled } from './totals'
import { turnsOf } from './turns'

export interface UsageSources {
  sessions: Sessions
  llm?: LLM
}

export const summarize = ({ sessions, llm }: UsageSources, query: UsageQuery): UsageSummary => {
  const infos = new Map(sessions.list().map(info => [info.id, info]))
  const rootOf = rootFinder(infos)
  const identify = identityResolver(llm)
  const accounts = accountBook(llm)
  const models = modelBook(llm)
  const periods = periodBook(query.zone, query.bucket)
  const threads = threadBook(infos)
  const total = emptyTotals()

  const isBranch = (id: string) => infos.get(id)?.kind === 'branch'
  for (const turn of turnsOf(sessions.entriesOfType?.('usage') ?? [], isBranch)) {
    if (turn.at < query.since) continue
    const id = identify(turn)
    const price = llm?.price?.(turn.model)
    const root = rootOf(turn.session)
    const groups = [
      total,
      accounts.add(id, root),
      models.add(turn, id, Boolean(price)),
      ...periods.add(turn.at, id.key),
      ...threads.add(root, turn.session, id.key),
    ]
    for (const totals of groups) addUsage(totals, turn.usage, price, isBilled(id.billing))
  }

  const limits = llm?.limits?.()
  const { count, ...rest } = threads.finish()
  return {
    ...query,
    until: Date.now(),
    total: { ...total, threads: count },
    accounts: accounts.finish(),
    ...models.finish(),
    periods: periods.finish(),
    ...rest,
    ...(limits && { limits }),
  }
}
