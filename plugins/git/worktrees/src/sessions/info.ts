import type { SessionInfo } from '@sand/chats/contract'

export const infoOf = (session: SessionInfo): SessionInfo => ({
  id: session.id,
  created: session.created,
  cwd: session.cwd,
  project: session.project,
  head: session.head,
  kind: session.kind,
  parent: session.parent,
  origin: session.origin,
  title: session.title,
  seen: session.seen,
  pinned: session.pinned,
  settled: session.settled,
  snoozed: session.snoozed,
  position: session.position,
})
