import type { LiveBlock, LiveEvent, LLMEvent } from '@sand/accounts/contract'
import { applyLiveEvent } from '@sand/server/contract'

type Delta = Extract<LiveEvent, { type: 'text' | 'thinking' | 'tool_input' }>

interface Held {
  event: Delta
  timer: Timer
}

const batchMs = 100

const liveOf = (event: LLMEvent): LiveEvent => {
  if (event.type === 'block') return { type: 'block', index: event.index }
  if (event.type === 'done') return { type: 'done' }
  return event
}

const isDelta = (event: LiveEvent): event is Delta => event.type === 'text' || event.type === 'thinking' || event.type === 'tool_input'

const join = (held: Delta, next: Delta): Delta | undefined => {
  if (held.type !== next.type || held.index !== next.index) return undefined
  if (held.type === 'tool_input' && next.type === 'tool_input') return { ...held, json: held.json + next.json }
  if (held.type !== 'tool_input' && next.type !== 'tool_input') return { ...held, text: held.text + next.text }
  return undefined
}

export const createLive = (send: (bot: string, event: LiveEvent) => void) => {
  const blocks = new Map<string, LiveBlock[]>()
  const pending = new Map<string, Held>()

  const flush = (bot: string) => {
    const held = pending.get(bot)
    if (!held) return
    clearTimeout(held.timer)
    pending.delete(bot)
    send(bot, held.event)
  }

  const hold = (bot: string, event: Delta) => {
    const held = pending.get(bot)
    const joined = held && join(held.event, event)
    if (joined) {
      held.event = joined
      return
    }
    flush(bot)
    pending.set(bot, { event, timer: setTimeout(() => flush(bot), batchMs) })
  }

  return {
    push(bot: string, event: LLMEvent) {
      const live = liveOf(event)
      if (live.type === 'done') blocks.delete(bot)
      else blocks.set(bot, applyLiveEvent(blocks.get(bot) ?? [], live))
      if (isDelta(live)) return hold(bot, live)
      flush(bot)
      send(bot, live)
    },
    snapshot(bot: string) {
      flush(bot)
      return blocks.get(bot) ?? []
    },
    clear(bot: string) {
      flush(bot)
      blocks.delete(bot)
    },
    stop() {
      for (const held of pending.values()) clearTimeout(held.timer)
      pending.clear()
    },
  }
}

export type Live = ReturnType<typeof createLive>
