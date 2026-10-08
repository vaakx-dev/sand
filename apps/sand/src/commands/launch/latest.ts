import type { ServerInfo, SessionSummary } from '@sand/protocol'
import { ask } from '../../daemon/ask'

export const latestSession = async (info: ServerInfo, cwd: string) =>
  (await ask<SessionSummary[]>(info, { type: 'sessions.list' }, 5000)).find(session => session.cwd === cwd && session.kind !== 'agent')?.id
