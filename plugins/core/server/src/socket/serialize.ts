import type { Session, SessionInfo } from '@sand/chats/contract'

export const isSession = (value: object): value is Session => 'owner' in value && value.owner === 'thread' && 'path' in value && typeof value.path === 'function'

export const info = (session: Session): SessionInfo => ({
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
  archived: session.archived,
  snoozed: session.snoozed,
  position: session.position,
})

export const serialize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(serialize)
  if (value instanceof AbortSignal) return undefined
  if (!value || typeof value !== 'object') return value
  if (isSession(value)) return { $session: info(value) }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => typeof entry !== 'function')
      .map(([key, entry]) => [key, serialize(entry)]),
  )
}
