import {
  type DiscoveredPc,
  discoverChange,
  type OutgoingJoin,
  type PairJoinResult,
  pairCancelJoin,
  pairJoin,
  pairJoinResult,
  pairJoins,
  pcsDiscover,
} from '@sand/devices-contract'
import type { UiContext } from '../inject'
import { feed } from './feed'

type ResultListener = (result: PairJoinResult, join: OutgoingJoin | undefined) => void

export const joinsData = (ctx: UiContext) => {
  const found = feed(() => ctx.wire.call(pcsDiscover, {}), [] as DiscoveredPc[])
  const outgoing = feed(() => ctx.wire.call(pairJoins, {}), [] as OutgoingJoin[])
  const listeners = new Set<ResultListener>()

  ctx.effect(() => ctx.wire.on(discoverChange, list => found.value.set(list)))
  ctx.effect(() =>
    ctx.wire.on(pairJoinResult, result => {
      const join = outgoing.value.get().find(entry => entry.id === result.id)
      outgoing.value.update(all => all.filter(entry => entry.id !== result.id))
      for (const listener of [...listeners]) listener(result, join)
    }),
  )

  const add = (join: OutgoingJoin) => {
    if (join.code) outgoing.value.update(all => [...all.filter(entry => entry.id !== join.id), join])
    return join
  }

  return {
    found,
    outgoing,
    unpaired: () => found.value.get().filter(pc => !pc.paired),
    joinOf: (pc: string) => outgoing.value.get().find(join => join.pc === pc),
    join: (url: string, pc?: string) => ctx.wire.call(pairJoin, { url, ...(pc && { pc }) }).then(add),
    cancel: async (id: string) => {
      await ctx.wire.call(pairCancelJoin, { id })
      outgoing.value.update(all => all.filter(entry => entry.id !== id))
    },
    onResult(listener: ResultListener) {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },
  }
}

export type JoinsData = ReturnType<typeof joinsData>
