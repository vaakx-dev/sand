import type { LLM } from '@sand/accounts/contract'
import type { NativeSessions, UsageQuery } from '../contract'
import { summarize, type UsageEntries } from './summarize'
import { outsideTurnOf } from './turns'

interface ServeSources {
  sessions: UsageEntries
  llm(): LLM | undefined
  native(): NativeSessions | undefined
}

const localZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone

const outsideTurns = async ({ llm, native }: ServeSources, since: number) => {
  const past = (await llm()?.pastTurns?.(since)) ?? []
  const inSand = native()?.natives() ?? new Set<string>()
  return past.filter(turn => !inSand.has(turn.native)).map(outsideTurnOf)
}

export const summaryHandler = (sources: ServeSources) => async (query: UsageQuery) => {
  const outside = query.origin === 'sand' ? [] : await outsideTurns(sources, query.since)
  return summarize({ sessions: sources.sessions, llm: sources.llm(), outside }, { ...query, zone: query.zone || localZone() })
}
