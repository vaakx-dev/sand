import type { Session, Sessions } from '@sand/sessions-sqlite/contract'
import type { Source } from './tree'

export const sessionSource = (sessions: Sessions | undefined, session: Session): Source => {
  const agents = sessions?.children(session.id) ?? []
  const seen = new Set<string>()

  const build = (current: Session, root: boolean): Source => {
    seen.add(current.id)
    const own = agents.filter(info => info.parent === current.id && !seen.has(info.id))
    return {
      id: current.id,
      cwd: current.cwd,
      entries: current.path(),
      label: root ? undefined : (current.title ?? undefined),
      origin: current.origin,
      children: own.flatMap(info => {
        const child = sessions?.open(info.id)
        return child ? [build(child, false)] : []
      }),
    }
  }

  return build(session, true)
}
