import type { GitPlace, GitStatus } from '@sand/git/contract'
import { threadChange, threadSelect, threadsChange } from '@sand/web-client/contract'
import { batch, sig } from '@vaakx-dev/vrui'
import type { Dispose } from 'drydock'
import type { ControlContext } from '../inject'
import { placeOf, samePlace } from './place'

export const followStatus = (ctx: ControlContext) => {
  const place = sig<GitPlace | undefined>(undefined)
  const thread = sig<string | undefined>(undefined)
  const running = sig(false)
  const status = sig<GitStatus | undefined>(undefined)
  let stop: Dispose | undefined
  let ticket = 0

  const untrack = () => {
    ticket++
    void stop?.()
    stop = undefined
  }

  const track = () => {
    untrack()
    const mine = ticket
    const at = place.get()
    status.set(at && ctx.gitStatus.current(at))
    if (!at) return
    stop = ctx.gitStatus.follow(at, next => {
      if (mine === ticket) status.set(next)
    })
  }

  const sync = () => {
    const chat = ctx.threads.current()
    batch(() => {
      thread.set(chat?.id)
      running.set(chat?.running ?? false)
    })
    const next = placeOf(ctx.threads)
    if (samePlace(next, place.get())) return
    place.set(next)
    track()
  }

  ctx.on(threadSelect, sync)
  ctx.on(threadsChange, sync)
  ctx.on(threadChange, sync)
  ctx.effect(() => {
    sync()
    return untrack
  })

  return { place, thread, running, status }
}

export type StatusModel = ReturnType<typeof followStatus>
