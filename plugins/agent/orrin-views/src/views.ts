import type { Session } from '@sand/chats/contract'
import type { Orrin, OrrinView } from '@sand/orrin/contract'
import { join, relative } from 'node:path'
import { placed, type Deps } from './deps'

export const createView = async (deps: Deps, session: Session) => {
  const found = placed(deps, session)
  if (!found) return undefined
  return found.orrin.call('view.create', { project: found.place.project.id, owner: `thread: ${session.title}` })
}

export const folderIn = (orrin: Orrin, session: Session, view: Pick<OrrinView, 'path'>) => {
  const place = orrin.placeAt(session.cwd)
  return place ? join(view.path, relative(place.view.path, session.cwd)) : view.path
}

export const findView = async (orrin: Orrin, view: string) => (await orrin.call('view.list', {})).views.find(found => found.id === view)

export const isOpen = async (orrin: Orrin, view: string) => (await findView(orrin, view))?.state === 'open'
