import type { OrrinEvent } from '@sand/orrin/contract'
import type { Steering } from '@sand/steering/contract'
import type { Deps } from './deps'

const note = (paths: string[]) =>
  `Main moved and changed ${paths.join(', ')}, which you have also edited, so your copies don't have main's change yet. Run pull to merge it in.`

export const tellSkipped = (deps: Deps, steering: Steering | undefined, event: OrrinEvent) => {
  if (event.type !== 'view.skipped' || !steering) return
  const owner = deps.sessions.list().find(summary => summary.orrinView === event.view && summary.kind === 'thread')
  const session = owner && deps.sessions.open(owner.id)
  if (session) steering.steer(session, note(event.paths), 'Main moved')
}
