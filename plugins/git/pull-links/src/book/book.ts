import type { Session, Sessions } from '@sand/chats/contract'
import { linksEntry, noLinks, parseLinks, type StoredLinks } from './record'

export interface LinkBook {
  read(session: string): StoredLinks
  write(session: Session, links: StoredLinks): void
  threads(): string[]
  forget(session: string): void
}

export const createLinkBook = (sessions: Sessions): LinkBook => {
  let index: Map<string, StoredLinks> | undefined

  const load = () => {
    if (index) return index
    const loaded = new Map<string, StoredLinks>()
    for (const entry of sessions.entriesOfType(linksEntry)) {
      const links = parseLinks(entry.data)
      if (links) loaded.set(entry.session, links)
    }
    index = loaded
    return loaded
  }

  return {
    read: session => load().get(session) ?? noLinks,
    write(session, links) {
      session.append(linksEntry, links)
      load().set(session.id, links)
    },
    threads: () => [...load().entries()].filter(([, links]) => links.links.length).map(([session]) => session),
    forget: session => void load().delete(session),
  }
}
