import type { LLMEvent } from '@sand/accounts/contract'

type Delta = Extract<LLMEvent, { type: 'text' | 'thinking' | 'tool_input' }>

interface Held<S> {
  event: Delta
  session: S
  timer?: Timer
}

const isDelta = (event: LLMEvent): event is Delta => event.type === 'text' || event.type === 'thinking' || event.type === 'tool_input'

const contentOf = (event: Delta) => (event.type === 'tool_input' ? event.json : event.text)

const withContent = (event: Delta, content: string): Delta =>
  event.type === 'tool_input' ? { ...event, json: content } : { ...event, text: content }

const join = (held: Delta, next: Delta): Delta | undefined =>
  held.type === next.type && held.index === next.index ? withContent(held, contentOf(held) + contentOf(next)) : undefined

const endOfLast = (text: string, mark: string) => {
  const at = text.lastIndexOf(mark)
  return at < 0 ? 0 : at + mark.length
}

const paragraphsEnd = (event: Delta) => (event.type === 'tool_input' ? 0 : endOfLast(event.text, '\n\n'))

const linesEnd = (event: Delta) => (event.type === 'tool_input' ? event.json.length : endOfLast(event.text, '\n') || event.text.length)

export const createCoalescer = <S extends { id: string }>(send: (event: LLMEvent, session: S) => void, overdueMs: number) => {
  const pending = new Map<string, Held<S>>()

  const release = (id: string) => {
    const held = pending.get(id)
    if (!held) return
    clearTimeout(held.timer)
    pending.delete(id)
    send(held.event, held.session)
  }

  const wait = (held: Held<S>) => {
    clearTimeout(held.timer)
    held.timer = setTimeout(() => releaseUpTo(held, linesEnd(held.event)), overdueMs)
  }

  const releaseUpTo = (held: Held<S>, end: number) => {
    if (end === 0) return
    const content = contentOf(held.event)
    if (end >= content.length) return release(held.session.id)
    send(withContent(held.event, content.slice(0, end)), held.session)
    held.event = withContent(held.event, content.slice(end))
    wait(held)
  }

  const flush = () => {
    for (const id of [...pending.keys()]) release(id)
  }

  const push = (event: LLMEvent, session: S) => {
    if (!isDelta(event)) {
      release(session.id)
      return send(event, session)
    }
    const held = pending.get(session.id)
    const joined = held && join(held.event, event)
    if (held && joined) {
      held.event = joined
      return releaseUpTo(held, paragraphsEnd(joined))
    }
    release(session.id)
    const fresh: Held<S> = { event, session }
    pending.set(session.id, fresh)
    wait(fresh)
    releaseUpTo(fresh, paragraphsEnd(event))
  }

  const stop = () => {
    for (const held of pending.values()) clearTimeout(held.timer)
    pending.clear()
  }

  return { push, flush, stop }
}
