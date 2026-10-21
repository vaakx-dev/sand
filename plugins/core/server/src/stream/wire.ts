import type { LiveEvent, LLMEvent } from '@sand/accounts/contract'
import type { WireSessionRef } from '@sand/chats/contract'

export const sessionRef = (session: { id: string }): WireSessionRef => ({ $session: { id: session.id } })

export const liveEvent = (event: LLMEvent): LiveEvent => {
  if (event.type === 'block') return { type: 'block', index: event.index }
  if (event.type === 'done') return { type: 'done' }
  return event
}
