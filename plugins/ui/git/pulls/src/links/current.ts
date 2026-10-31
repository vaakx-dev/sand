import { threadChange, threadSelect, threadsChange, type Threads } from '@sand/web-client/contract'
import { sig } from '@vaakx-dev/vrui'
import type { PullPlace } from '../contract'
import type { PullsContext } from '../inject'

export const placeOf = (threads: Threads): PullPlace | undefined => {
  const chat = threads.current()
  if (!chat || chat.info.kind === 'quick' || !chat.info.cwd) return undefined
  return { session: chat.id, cwd: chat.info.cwd, device: chat.device }
}

export const samePlace = (a: PullPlace | undefined, b: PullPlace | undefined) => a?.session === b?.session && a?.cwd === b?.cwd && a?.device === b?.device

export const currentPlace = (ctx: PullsContext) => {
  const place = sig<PullPlace | undefined>(undefined)
  const sync = () => {
    const next = placeOf(ctx.threads)
    if (!samePlace(next, place.get())) place.set(next)
  }
  ctx.on(threadSelect, sync)
  ctx.on(threadsChange, sync)
  ctx.on(threadChange, sync)
  ctx.effect(sync)
  return place
}
