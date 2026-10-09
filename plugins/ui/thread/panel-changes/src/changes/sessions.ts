import type { Session, Sessions } from '@sand/protocol'
import type { Source } from './tree'

export const sessionSource = (sessions: Sessions | undefined, session: Session, root = true, seen = new Set<string>()): Source => {
  seen.add(session.id)
  const children = (sessions?.list() ?? []).filter(info => info.kind === 'agent' && info.parent === session.id && !seen.has(info.id))
  return {
    id: session.id,
    cwd: session.cwd,
    entries: session.path(),
    label: root ? undefined : (session.title ?? undefined),
    origin: session.origin,
    children: children.flatMap(info => {
      const child = sessions?.open(info.id)
      return child ? [sessionSource(sessions, child, false, seen)] : []
    }),
  }
}
