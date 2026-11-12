import { type DiscoveredPc, discoverChange, type OutgoingJoin, pairCancelJoin, pairJoin, pairJoinResult, pcsDiscover, unjoinedText, type wire } from '@sand/devices-contract'
import { unanswered } from '@sand/host-hub/contract'
import { errorMessage } from '@sand/util'
import { sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { whileBusy } from '../parts'

export interface JoinedPc {
  id: string
  name: string
}

export const pcJoining = (ctx: Context<{ wire: typeof wire }>, joined: (pc: JoinedPc) => void) => {
  const found = sig<DiscoveredPc[]>([])
  const waiting = sig<OutgoingJoin | undefined>(undefined)
  const busy = sig(false)
  const error = sig('')

  ctx.effect(() => ctx.wire.on(discoverChange, list => found.set(list)))
  ctx.effect(() =>
    ctx.wire.on(pairJoinResult, result => {
      const asked = waiting.get()
      if (!asked || result.id !== asked.id) return
      waiting.set(undefined)
      if (result.outcome === 'approved') return joined({ id: asked.pc, name: asked.name })
      error.set(unjoinedText(asked.name, result.outcome, result.error))
    }),
  )

  const discover = () => {
    error.set('')
    void ctx.wire.call(pcsDiscover, {}).then(
      list => found.set(list),
      failure => error.set(unanswered(failure) ? '' : errorMessage(failure)),
    )
  }

  const join = (pc: DiscoveredPc) =>
    whileBusy(busy, async () => {
      error.set('')
      try {
        waiting.set(await ctx.wire.call(pairJoin, { url: pc.url }))
      } catch (failure) {
        error.set(errorMessage(failure))
      }
    })

  const stop = () => {
    const asked = waiting.get()
    waiting.set(undefined)
    if (asked) ctx.wire.call(pairCancelJoin, { id: asked.id }).catch(failure => error.set(errorMessage(failure)))
  }

  return { found, waiting, busy, error, discover, join, stop }
}

export type PcJoining = ReturnType<typeof pcJoining>
