import type { Session } from '@sand/chats/contract'
import type { Orrin, OrrinPlace } from '@sand/orrin/contract'
import { join, relative, resolve } from 'node:path'

export interface ChatView {
  place: OrrinPlace
  id: string
  root: string
}

export const createChatViews = (orrin: Orrin) => {
  const roots = new Map<string, string>()

  const rootOf = async (id: string) => {
    if (!roots.has(id)) for (const view of (await orrin.call('view.list', {})).views) roots.set(view.id, resolve(view.path))
    const root = roots.get(id)
    if (!root) throw new Error(`Orrin view ${id} no longer exists`)
    return root
  }

  const of = async (session: Session): Promise<ChatView | undefined> => {
    const place = orrin.placeAt(session.cwd)
    if (!place) return undefined
    const id = session.orrinView ?? place.view.id
    return { place, id, root: id === place.view.id ? resolve(place.view.path) : await rootOf(id) }
  }

  const folder = async (session: Session) => {
    const view = session.orrinView ? await of(session) : undefined
    return view && join(view.root, relative(view.place.view.path, session.cwd))
  }

  return { of, folder }
}

export type ChatViews = ReturnType<typeof createChatViews>
