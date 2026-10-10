import type { Sessions } from '@sand/sessions-sqlite/contract'
import type { WorktreesConfig } from '../config'
import type { Publish } from '../setup/steps'

export interface Ops {
  config: WorktreesConfig
  sessions: Sessions
  running: Set<string>
  publish: Publish
  changed(main: string): void
}

export const openSession = (ops: Ops, id: unknown) => {
  const session = ops.sessions.open(String(id))
  if (!session) throw new Error('That thread no longer exists')
  return session
}

export const idle = (ops: Ops, id: string) => {
  if (ops.running.has(id)) throw new Error('Wait for the turn to finish first')
}
