import { type Threads, threadChange, threadSelect, threadsChange } from '@sand/web-client/contract'
import { owned } from '@sand/web-client/reactive'
import { derive, sig } from '@vaakx-dev/vrui'
import type { Context, Dispose } from 'drydock'
import { type GitPlace, placeKey, type PlaceStatus } from '../contract'
import type { StatusClient } from './client'

const currentPlace = (threads: Threads): GitPlace | undefined => {
  const chat = threads.current()
  if (chat) return chat.info.kind === 'quick' || !chat.info.cwd ? undefined : { cwd: chat.info.cwd, device: chat.device }
  const draft = threads.drafting()
  return draft?.cwd ? { cwd: draft.cwd, device: draft.device } : undefined
}

export const followCurrent = (ctx: Context, threads: Threads, client: StatusClient) => {
  const current = sig<PlaceStatus | undefined>(undefined)
  let followed: string | undefined
  let stop: Dispose | undefined

  const unfollow = () => {
    void stop?.()
    stop = undefined
  }

  const follow = (place: GitPlace | undefined) => {
    unfollow()
    current.set(place && { place })
    if (!place) return
    const mine = followed
    stop = client.follow(place, status => {
      if (followed === mine) current.set({ place, status })
    })
  }

  const sync = () => {
    const place = currentPlace(threads)
    const key = place && placeKey(place)
    if (key === followed) return
    followed = key
    follow(place)
  }

  ctx.on(threadSelect, sync)
  ctx.on(threadsChange, sync)
  ctx.on(threadChange, sync)
  ctx.effect(() => {
    sync()
    return () => {
      unfollow()
      followed = undefined
    }
  })

  return owned(ctx, () => derive(() => current.get()))
}
