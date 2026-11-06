import { place, spaceOpen, spaces, type Spaces } from '@sand/layout/contract'
import { joinDisposers } from '@sand/util'
import type { BotsContext } from './context'
import { covered, type Covered } from './cover'

export interface Hosted {
  side(close?: () => void): HTMLElement
  main(close?: () => void): HTMLElement
  attention(): boolean
  requested(): boolean
  left(): void
}

export const space = 'bots'

const inSpace = (ctx: BotsContext, found: Spaces, views: Hosted) => {
  const stop = joinDisposers(
    found.space({ id: space, label: 'Bots', icon: 'bot', order: 20, attention: views.attention }),
    place(ctx, { space, region: 'side' }, () => views.side()),
    place(ctx, { space, region: 'main' }, () => views.main()),
    ctx.on(spaceOpen, id => {
      if (id !== space) views.left()
    }),
  )
  if (views.requested() && found.active() !== space) found.open(space)
  return stop
}

export const host = (ctx: BotsContext, views: Hosted, fallback: Covered) =>
  ctx.watch(spaces, found => (found ? inSpace(ctx, found, views) : covered(ctx, views, fallback)))
