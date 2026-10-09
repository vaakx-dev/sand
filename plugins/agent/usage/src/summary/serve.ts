import type { RequestHandler } from '@sand/protocol'
import type { UsageQuery } from '../contract'
import type { Context } from 'drydock'
import { summarize } from './summarize'

const queryOf = (request: Record<string, unknown>): UsageQuery => ({
  since: Number(request.since) || 0,
  bucket: request.bucket === 'hour' ? 'hour' : 'day',
  zone: typeof request.zone === 'string' && request.zone ? request.zone : Intl.DateTimeFormat().resolvedOptions().timeZone,
})

export const summaryHandler =
  (ctx: Context): RequestHandler =>
  request => {
    if (!ctx.sessions) throw new Error('No thread store is loaded')
    return summarize({ sessions: ctx.sessions, llm: ctx.llm }, queryOf(request))
  }
