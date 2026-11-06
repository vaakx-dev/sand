import { HandedOver } from '../contract'
import type { EngineContext } from '../context'
import type { TurnStore } from '../store/turns'

const leaseFor = 20_000
const beatEvery = 5_000

export interface Held {
  controller: AbortController
  parked(): boolean
}

export const createLeases = (ctx: EngineContext, store: TurnStore) => {
  const holder = `${ctx.cli.place}-${process.pid}-${Bun.randomUUIDv7().slice(-8)}`
  const held = new Map<string, Held>()
  let timer: Timer | undefined
  let draining = false

  const until = () => Date.now() + leaseFor

  const beat = () => {
    const kept = new Set(store.renew(holder, until()).flatMap(turn => (turn.cancel ? [] : [turn.id])))
    for (const [id, run] of held) if (!kept.has(id)) run.controller.abort()
  }

  const stop = () => {
    clearInterval(timer)
    timer = undefined
  }

  const handOver = (turn: string, run: Held) => {
    if (!draining || !run.parked()) return
    held.delete(turn)
    store.release(turn, holder)
    run.controller.abort(new HandedOver())
  }

  ctx.effect(() => stop)

  return {
    holder,
    until,
    hold(turn: string, run: Held) {
      held.set(turn, run)
      timer ??= setInterval(beat, beatEvery)
      return () => {
        held.delete(turn)
        if (!held.size) stop()
      }
    },
    interrupt(turn: string) {
      const run = held.get(turn)
      if (run) run.controller.abort()
      else store.cancel(turn)
    },
    check(turn: string) {
      const run = held.get(turn)
      if (run) handOver(turn, run)
    },
    drain() {
      draining = true
      held.forEach((run, turn) => handOver(turn, run))
    },
  }
}

export type Leases = ReturnType<typeof createLeases>
