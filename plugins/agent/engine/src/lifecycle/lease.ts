import type { Interruption } from '../contract'
import type { EngineContext } from '../context'
import type { TurnStore } from '../store/turns'

const leaseFor = 20_000
const beatEvery = 5_000

export const createLeases = (ctx: EngineContext, store: TurnStore) => {
  const holder = `${ctx.cli.place}-${process.pid}-${Bun.randomUUIDv7().slice(-8)}`
  const held = new Map<string, AbortController>()
  let timer: Timer | undefined
  let leaving = false
  let watching = 0
  let staying: (() => void) | undefined

  const until = () => Date.now() + leaseFor

  const beat = () => {
    const kept = new Set(store.renew(holder, until()).flatMap(turn => (turn.cancel ? [] : [turn.id])))
    for (const [id, controller] of held) if (!kept.has(id)) controller.abort()
  }

  const stay = () => {
    if (leaving && watching) staying ??= ctx.busy()
  }

  const unwatch = () => {
    watching--
    if (watching) return
    staying?.()
    staying = undefined
  }

  const stop = () => {
    clearInterval(timer)
    timer = undefined
  }

  ctx.effect(() => stop)

  return {
    holder,
    until,
    leave() {
      leaving = true
      stay()
    },
    watch() {
      watching++
      stay()
      return unwatch
    },
    leaving: () => leaving,
    hold(turn: string, controller: AbortController) {
      held.set(turn, controller)
      timer ??= setInterval(beat, beatEvery)
      return () => {
        held.delete(turn)
        if (!held.size) stop()
      }
    },
    interrupt(turn: string, interruption?: Interruption) {
      const controller = held.get(turn)
      if (controller) controller.abort(interruption)
      else store.cancel(turn)
    },
  }
}

export type Leases = ReturnType<typeof createLeases>
