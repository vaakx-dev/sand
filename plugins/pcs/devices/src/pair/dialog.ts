import { dynamicChild, effect, onTimeout, overlay, sheet, sheetBody, sheetHead, show } from '@sand/dom'
import type { Context } from 'drydock'
import type { DeviceSource } from '../source'
import { pairInvite } from './invite'
import { inviteBody } from './links'

export const pairDialog = (ctx: Context<'wire'>, source: DeviceSource, shown: Set<number>, close: () => void) => {
  const { invite, error } = pairInvite(ctx, source.epoch, shown)
  effect(() => {
    const failure = error.get()
    if (!failure) return
    onTimeout(() => {
      source.fail(failure)
      close()
    })
  })
  return show(invite.map(Boolean), () =>
    overlay(
      close,
      sheet(
        { 'aria-label': 'Pair a new device', class: 'max-w-lg' },
        sheetHead('Pair a new device', close),
        sheetBody({}, dynamicChild(invite, current => current && inviteBody(current, source.listenOnLan))),
      ),
    ),
  )
}
