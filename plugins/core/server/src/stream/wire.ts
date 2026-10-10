import type { LiveEvent, LLMEvent } from '@sand/llm-accounts/contract'
import type { WireEvent } from '@sand/protocol'
import type { WireSessionRef } from '@sand/sessions-sqlite/contract'

export const sessionRef = (session: { id: string }): WireSessionRef => ({ $session: { id: session.id } })

export const liveEvent = (event: LLMEvent): LiveEvent => {
  if (event.type === 'block') return { type: 'block', index: event.index }
  if (event.type === 'done') return { type: 'done' }
  return event
}

export const eventFrame = (event: WireEvent) => JSON.stringify({ type: 'event', ...event })
