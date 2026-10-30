import { type JoinRequest, type PairSettled, pairApprove, pairDeny, pairRequested, pairRequests, pairSettled } from '@sand/devices-contract'
import type { UiContext } from '../inject'
import { feed } from './feed'

type SettledListener = (settled: PairSettled, request: JoinRequest | undefined) => void

export const requestsData = (ctx: UiContext) => {
  const pending = feed(() => ctx.wire.call(pairRequests, {}), [] as JoinRequest[])
  const listeners = new Set<SettledListener>()
  const mine = new Set<string>()

  ctx.effect(() =>
    ctx.wire.on(pairRequested, request => {
      if (!pending.value.get().some(known => known.id === request.id)) pending.value.update(all => [...all, request])
    }),
  )

  ctx.effect(() =>
    ctx.wire.on(pairSettled, settled => {
      const request = pending.value.get().find(known => known.id === settled.id)
      pending.value.update(all => all.filter(known => known.id !== settled.id))
      for (const listener of [...listeners]) listener(settled, request)
      mine.delete(settled.id)
    }),
  )

  const target = (request: JoinRequest) => ({ id: request.id, pc: request.pc })

  return {
    pending,
    get: (id: string) => pending.value.get().find(request => request.id === id),
    live: (now: number) => pending.value.get().filter(request => request.expires > now),
    decidedHere: (id: string) => mine.has(id),
    approve(request: JoinRequest) {
      mine.add(request.id)
      return ctx.wire.call(pairApprove, target(request))
    },
    deny(request: JoinRequest) {
      mine.add(request.id)
      return ctx.wire.call(pairDeny, target(request))
    },
    onSettled(listener: SettledListener) {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },
  }
}

export type RequestsData = ReturnType<typeof requestsData>
