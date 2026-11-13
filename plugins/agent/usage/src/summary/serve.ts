import type { LLM } from '@sand/accounts/contract'
import type { Sessions } from '@sand/chats/contract'
import type { UsageQuery } from '../contract'
import { summarize } from './summarize'

const localZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone

export const summaryHandler = (sessions: Sessions, llm: () => LLM | undefined) => (query: UsageQuery) =>
  summarize({ sessions, llm: llm() }, { ...query, zone: query.zone || localZone() })
