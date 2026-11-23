import type { LLM } from '@sand/accounts/contract'
import type { UsageQuery } from '../contract'
import type { OutsideTurns } from './outside'
import { summarize, type UsageEntries } from './summarize'

interface ServeSources {
  sessions: UsageEntries
  llm(): LLM | undefined
  outside: OutsideTurns
}

const localZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone

export const summaryHandler = (sources: ServeSources) => (query: UsageQuery) => {
  const outside = query.origin === 'sand' ? [] : sources.outside.turns(query.since)
  return summarize({ sessions: sources.sessions, llm: sources.llm(), outside }, { ...query, zone: query.zone || localZone() })
}
