import type { Session } from '@sand/chats/contract'
import { plural } from '@sand/util'
import { placed, type Deps } from './deps'
import { isOpen } from './views'

export const closeView = async (deps: Deps, session: Session) => {
  const found = session.kind === 'thread' && session.orrinView ? placed(deps, session) : undefined
  const view = session.orrinView
  if (!found || !view) return undefined
  if (await isOpen(found.orrin, view)) {
    const { files } = await found.orrin.call('changes', { project: found.place.project.id, view })
    if (files.length) return `${plural(files.length, 'file')} with unlanded changes. Land them first.`
    await found.orrin.call('view.drop', { view })
  }
  deps.sessions.update(session.id, { orrinView: null })
  return undefined
}
