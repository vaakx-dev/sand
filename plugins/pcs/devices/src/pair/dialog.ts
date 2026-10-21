import { dynamicChild, effect, onTimeout, show } from '@vaakx-dev/vrui'
import type { DevicesContext } from '../inject'
import type { DeviceSource } from '../source'
import { pairInvite } from './invite'
import { inviteBody } from './links'

export const pairDialog = (ctx: DevicesContext, source: DeviceSource, shown: Set<number>, close: () => void) => {
  const { overlay, primaryAction, sheet, sheetBody, sheetFoot, sheetHead } = ctx.kit
  const { invite, error } = pairInvite(ctx, source.epoch, shown)
  effect(() => {
    const failure = error.get()
    if (!failure) return
    onTimeout(close)
  })
  return show(invite.map(Boolean), () =>
    overlay(
      close,
      sheet(
        { 'aria-label': 'Pair a new device', size: 'md' },
        sheetHead({ title: 'Pair a new device', close }),
        sheetBody({}, dynamicChild(invite, current => current && inviteBody(ctx.kit, current, source.listenOnLan))),
        sheetFoot(primaryAction({ onClick: close }, 'Done')),
      ),
    ),
  )
}
