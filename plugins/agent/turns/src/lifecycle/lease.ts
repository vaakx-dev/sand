import type { TurnsContext } from '../context'
import type { TurnStore } from '../store/turns'

const leaseFor = 20_000
const beatEvery = 5_000

export const createLeases = (ctx: TurnsContext, store: TurnStore) => {
  const owner = `${ctx.cli.place}-${process.pid}-${Bun.randomUUIDv7().slice(-8)}`
  const held = new Map<string, AbortController>()
  let timer: Timer | undefined

  const until = () => Date.now() + leaseFor

  const beat = () => {
    const kept = new Set(store.renew(owner, until()).flatMap(turn => (turn.cancel ? [] : [turn.id])))
    for (const [id, controller] of held) if (!kept.has(id)) controller.abort()
  }

  const stop = () => {
    clearInterval(timer)
    timer = undefined
  }

  ctx.effect(() => stop)

  return {
    owner,
    until,
    hold(turn: string, controller: AbortController) {
      held.set(turn, controller)
      timer ??= setInterval(beat, beatEvery)
      return () => {
        held.delete(turn)
        if (!held.size) stop()
      }
    },
    interrupt(turn: string) {
      const controller = held.get(turn)
      if (controller) controller.abort()
      else store.cancel(turn)
    },
  }
}

export type Leases = ReturnType<typeof createLeases>
