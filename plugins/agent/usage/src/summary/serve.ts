import { llm } from '@sand/accounts/contract'
import { sessions } from '@sand/chats/contract'
import type { Context } from 'drydock'
import type { UsageQuery } from '../contract'
import { summarize } from './summarize'

const localZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone

export const summaryHandler = (ctx: Context) => (query: UsageQuery) => {
  const store = ctx.get(sessions)
  if (!store) throw new Error('No chat store is loaded')
  return summarize({ sessions: store, llm: ctx.get(llm) }, { ...query, zone: query.zone || localZone() })
}
