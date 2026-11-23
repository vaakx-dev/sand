import type { LLM } from '@sand/accounts/contract'
import type { Sessions } from '@sand/chats/contract'
import type { UsageOrigin, UsageQuery, UsageSummary } from '../contract'
import { isBilled } from '../contract/billed'
import { emptyTotals } from '../records'
import { accountBook } from './accounts'
import { identityResolver, knownAccounts } from './identity'
import { modelBook, nameOf } from './models'
import { periodBook } from './periods'
import { projectBook } from './projects'
import { addUsage } from './totals'
import { type Turn, turnsOf } from './turns'

export type UsageEntries = Pick<Sessions, 'list' | 'entriesOfType'>

export interface UsageSources {
  sessions: UsageEntries
  llm?: LLM
  outside?: Turn[]
}

const turnsFrom = (sessions: UsageEntries, outside: Turn[], origin?: UsageOrigin) => {
  switch (origin) {
    case 'sand':
      return turnsOf(sessions.entriesOfType('usage'))
    case 'outside':
      return outside
    case undefined:
      return [...turnsOf(sessions.entriesOfType('usage')), ...outside]
  }
}

export const summarize = ({ sessions, llm, outside = [] }: UsageSources, query: UsageQuery): UsageSummary => {
  const infos = new Map(sessions.list().map(info => [info.id, info]))
  const known = knownAccounts(llm)
  const identify = identityResolver(llm, known)
  const accounts = accountBook(known, llm)
  const models = modelBook(llm)
  const periods = periodBook(query.zone, query.bucket)
  const projects = projectBook(infos)
  const total = emptyTotals()

  for (const turn of turnsFrom(sessions, outside, query.origin)) {
    if (turn.at < query.since) continue
    const id = identify(turn)
    const price = llm?.price?.(turn.model)
    const groups = [
      total,
      accounts.add(id),
      models.add(turn, id, Boolean(price)),
      ...periods.add(turn.at, id.key, nameOf(turn.model)),
      projects.add(turn),
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
