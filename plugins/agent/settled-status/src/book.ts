import type { Session, Sessions } from '@sand/chats/contract'
import { z } from 'zod'

const entryType = 'settled-status'

const stored = z.object({ text: z.string().nullable() })

export const createBook = (sessions: Sessions) => {
  let index: Map<string, string> | undefined

  const load = () => {
    if (index) return index
    const loaded = new Map<string, string>()
    for (const entry of sessions.entriesOfType(entryType)) {
      const text = stored.safeParse(entry.data).data?.text
      if (text) loaded.set(entry.session, text)
      else loaded.delete(entry.session)
    }
    index = loaded
    return loaded
  }

  return {
    has: (session: string) => load().has(session),
    all: () => Object.fromEntries(load()),
    write(session: Session, text: string | null) {
      session.append(entryType, { text })
      if (text) load().set(session.id, text)
      else load().delete(session.id)
    },
    forget: (session: string) => void load().delete(session),
  }
}
