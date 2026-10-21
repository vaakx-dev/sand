import type { Prompt, Session, UserContent } from '@sand/chats/contract'
import type { Pending } from './contract'
import { promptContent, promptLabel } from '@sand/chats/prompt'

type Steer = Pending & { prompt: UserContent[] }

export const createQueues = (changed: (session: Session) => void) => {
  const queues = new Map<string, Steer[]>()
  const list = (session: Session) => [...(queues.get(session.id) ?? [])]
  const set = (session: Session, items: Steer[]) => {
    if (items.length) queues.set(session.id, items)
    else queues.delete(session.id)
    changed(session)
  }
  return {
    list,
    add(session: Session, prompt: Prompt, label?: string) {
      const steer: Steer = { id: Bun.randomUUIDv7(), label: label ?? promptLabel(prompt), prompt: promptContent(prompt), at: Date.now() }
      set(session, [...list(session), steer])
      return steer.id
    },
    remove(session: Session, id: string) {
      const items = list(session)
      if (!items.some(steer => steer.id === id)) return false
      set(session, items.filter(steer => steer.id !== id))
      return true
    },
    take(session: Session) {
      const items = list(session)
      if (items.length) set(session, [])
      return items
    },
  }
}
