import { div, dynamicChild, effect, overlay, sheet, sheetHead, show } from '@sand/dom'
import type { Context } from 'drydock'
import { pairInvite, type DeviceSource } from '../source'
import { inviteBody } from './links'

export const pairDialog = (ctx: Context<'wire'>, source: DeviceSource, shown: Set<number>, close: () => void) => {
  const { invite, error } = pairInvite(ctx, source.epoch, shown)
  effect(() => {
    const failure = error.get()
    if (failure)
      queueMicrotask(() => {
        source.fail(failure)
        close()
      })
  })
  const listen = async () => {
    try {
      await source.setLan(true)
    } catch (failure) {
      source.fail(failure)
    }
  }
  return show(invite.map(Boolean), () =>
    overlay(
      close,
      sheet(
        { 'aria-label': 'Pair a new device', class: 'max-w-lg' },
        sheetHead('Pair a new device', close),
        div(
          { class: 'flex min-h-0 flex-col overflow-auto px-5 pt-1 pb-5' },
          dynamicChild(invite, current => (current ? inviteBody(current, listen) : div())),
        ),
      ),
    ),
  )
}
