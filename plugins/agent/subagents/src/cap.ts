import { turnEnd, turnReady } from '@sand/turns-contract/contract'
import type { AgentsContext } from './context'
import { slots } from './slots'

export const capAgents = (ctx: AgentsContext, maxAgents: number) => {
  const take = slots(maxAgents)
  const held = new Map<string, () => void>()

  const release = (session: string) => {
    held.get(session)?.()
    held.delete(session)
  }

  ctx.on(turnReady, async (_start, session, signal) => {
    if (session.kind !== 'agent') return
    const free = await take(signal)
    held.set(session.id, free)
    signal.addEventListener('abort', () => held.get(session.id) === free && release(session.id), { once: true })
  })
  ctx.on(turnEnd, session => release(session.id))
  ctx.effect(() => () => [...held.keys()].forEach(release))
}
