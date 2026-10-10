import type { LLMEvent } from '@sand/llm-accounts/contract'

type Delta = Extract<LLMEvent, { type: 'text' | 'thinking' | 'tool_input' }>

interface Held<S> {
  event: Delta
  session: S
}

const isDelta = (event: LLMEvent): event is Delta => event.type === 'text' || event.type === 'thinking' || event.type === 'tool_input'

const join = (held: Delta, next: Delta): Delta | undefined => {
  if (held.index !== next.index) return undefined
  if (held.type === 'tool_input' && next.type === 'tool_input') return { ...held, json: held.json + next.json }
  if (held.type === next.type && held.type !== 'tool_input' && next.type !== 'tool_input') return { ...held, text: held.text + next.text }
  return undefined
}

export const createCoalescer = <S extends { id: string }>(send: (event: LLMEvent, session: S) => void, delay: number) => {
  const pending = new Map<string, Held<S>>()
  let timer: Timer | undefined

  const release = (id: string) => {
    const held = pending.get(id)
    if (!held) return
    pending.delete(id)
    send(held.event, held.session)
  }

  const flush = () => {
    clearTimeout(timer)
    timer = undefined
    for (const id of [...pending.keys()]) release(id)
  }

  const push = (event: LLMEvent, session: S) => {
    if (!isDelta(event)) {
      release(session.id)
      return send(event, session)
    }
    const held = pending.get(session.id)
    const joined = held && join(held.event, event)
    if (held && joined) held.event = joined
    else {
      release(session.id)
      pending.set(session.id, { event, session })
    }
    timer ??= setTimeout(flush, delay)
  }

  const stop = () => {
    clearTimeout(timer)
    timer = undefined
    pending.clear()
  }

  return { push, flush, stop }
}
