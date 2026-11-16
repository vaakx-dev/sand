import type { LLM } from '@sand/accounts/contract'
import type { Sessions } from '@sand/chats/contract'
import type { UsageQuery, UsageSummary } from '../contract'
import { isBilled } from '../contract/billed'
import { emptyTotals } from '../records'
import { accountBook } from './accounts'
import { identityResolver, knownAccounts } from './identity'
import { modelBook, nameOf } from './models'
import { periodBook } from './periods'
import { projectBook } from './projects'
import { addUsage } from './totals'
import { turnsOf } from './turns'

export interface UsageSources {
  sessions: Sessions
  llm?: LLM
}

export const summarize = ({ sessions, llm }: UsageSources, query: UsageQuery): UsageSummary => {
  const infos = new Map(sessions.list().map(info => [info.id, info]))
  const known = knownAccounts(llm)
  const identify = identityResolver(llm, known)
  const accounts = accountBook(known, llm)
  const models = modelBook(llm)
  const periods = periodBook(query.zone, query.bucket)
  const projects = projectBook(infos)
  const total = emptyTotals()

  for (const turn of turnsOf(sessions.entriesOfType('usage'))) {
    if (turn.at < query.since) continue
    const id = identify(turn)
    const price = llm?.price?.(turn.model)
    const groups = [
      total,
      accounts.add(id),
      models.add(turn, id, Boolean(price)),
      ...periods.add(turn.at, id.key, nameOf(turn.model)),
      projects.add(turn.session),
    ]
    for (const totals of groups) addUsage(totals, turn.usage, price, isBilled(id.billing))
  }

  return {
    ...query,
    until: Date.now(),
    total,
    accounts: accounts.finish(),
    ...models.finish(),
    periods: periods.finish(),
    projects: projects.finish(),
  }
}
