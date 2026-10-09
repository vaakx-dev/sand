import type { Daemon } from '@sand/protocol'
import type { SessionSummary } from '@sand/sessions-sqlite/contract'

export const latestSession = async (daemon: Daemon) =>
  (await daemon.request<SessionSummary[]>({ type: 'sessions.list' }, { timeout: 5000 })).find(session => session.kind !== 'agent')?.id
