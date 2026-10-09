import { promptLabel } from '@sand/kit'
import { definePlugin } from 'drydock'
import { content, runTurn } from './turn'
import type { Turn } from './types'

export default definePlugin({
  name: 'loop-react',
  inject: ['llm', 'context', 'tools'],
  apply(ctx) {
    const turns = new Map<string, Turn>()
    ctx.provide('loop', {
      run: (session, prompt, signal) => runTurn(ctx, turns, session, prompt, signal),
      steer(session, prompt, label) {
        const turn = turns.get(session.id)
        if (!turn) return undefined
        const id = Bun.randomUUIDv7()
        turn.queue.push({ id, label: label ?? promptLabel(prompt), prompt: content(prompt), at: Date.now() })
        ctx.emit('turn.queue', session)
        return id
      },
      unsteer(session, id) {
        const turn = turns.get(session.id)
        const index = turn?.queue.findIndex(steer => steer.id === id) ?? -1
        if (index < 0) return false
        turn!.queue.splice(index, 1)
        ctx.emit('turn.queue', session)
        return true
      },
      steers: session => [...(turns.get(session.id)?.queue ?? [])],
      interrupt(session) {
        const turn = turns.get(session.id)
        turn?.controller.abort()
        return Boolean(turn)
      },
      active: session => turns.has(session.id),
    })
  },
})
