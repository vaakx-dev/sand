import type { GitPlace, GitStatus } from '@sand/git/contract'
import { threadChange, threadSelect, threadsChange } from '@sand/web-client/contract'
import { batch, sig } from '@vaakx-dev/vrui'
import type { Dispose } from 'drydock'
import type { ChangesContext } from '../inject'
import { placeOf, samePlace } from './place'

export const followPlace = (ctx: ChangesContext) => {
  const place = sig<GitPlace | undefined>(undefined)
  const status = sig<GitStatus | undefined>(undefined)
  let stop: Dispose | undefined
  let ticket = 0

  const unfollow = () => {
    ticket++
    void stop?.()
    stop = undefined
  }

  const track = () => {
    unfollow()
    const mine = ticket
    const at = place.get()
    status.set(at && ctx.gitStatus.current(at))
    if (!at) return
    stop = ctx.gitStatus.follow(at, next => {
      if (mine === ticket) status.set(next)
    })
  }

  const sync = () => {
    const next = placeOf(ctx.threads)
    if (samePlace(next, place.get())) return
    batch(() => {
      place.set(next)
      track()
    })
  }

  ctx.on(threadSelect, sync)
  ctx.on(threadsChange, sync)
  ctx.on(threadChange, sync)
  ctx.effect(() => {
    sync()
    return unfollow
  })

  const refresh = async () => {
    const at = place.get()
    if (at) await ctx.gitStatus.refresh(at).catch(() => undefined)
  }

  return { place, status, refresh }
}

export type PlaceModel = ReturnType<typeof followPlace>
