import type { LLM } from '@sand/accounts/contract'
import type { Sessions } from '@sand/chats/contract'
import type { UsageQuery, UsageSummary } from '../contract'
import { emptyTotals } from '../records'
import { accountBook } from './accounts'
import { identityResolver } from './identity'
import { modelBook } from './models'
import { periodBook } from './periods'
import { projectBook } from './projects'
import { addUsage, isBilled } from './totals'
import { turnsOf } from './turns'

export interface UsageSources {
  sessions: Sessions
  llm?: LLM
}

export const summarize = ({ sessions, llm }: UsageSources, query: UsageQuery): UsageSummary => {
  const infos = new Map(sessions.list().map(info => [info.id, info]))
  const identify = identityResolver(llm)
  const accounts = accountBook(llm)
  const models = modelBook(llm)
  const periods = periodBook(query.zone, query.bucket)
  const projects = projectBook(infos)
  const total = emptyTotals()

  for (const turn of turnsOf(sessions.entriesOfType?.('usage') ?? [])) {
    if (turn.at < query.since) continue
    const id = identify(turn)
    const price = llm?.price?.(turn.model)
    const groups = [
      total,
      accounts.add(id),
      models.add(turn, id, Boolean(price)),
      ...periods.add(turn.at, id.key),
      projects.add(turn.session, id.key),
    ]
    for (const totals of groups) addUsage(totals, turn.usage, price, isBilled(id.billing))
  }

  const limits = llm?.limits?.()
  return {
    ...query,
    until: Date.now(),
    total,
    accounts: accounts.finish(),
    ...models.finish(),
    periods: periods.finish(),
    projects: projects.finish(),
    ...(limits && { limits }),
  }
}
