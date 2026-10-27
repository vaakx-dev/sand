import { pairUsed } from '@sand/host-devices/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { errorMessage } from '@sand/util'
import { derive, div, dynamicChild, effect, keys, show, sig } from '@vaakx-dev/vrui'
import type { DevicesContext } from '../inject'
import { pairInvite } from '../pair/invite'
import { inviteBody } from '../pair/links'
import type { DeviceSource } from '../source'

const pasteRow = (kit: Kit, source: DeviceSource, joined: (name: string) => void) => {
  const { errorText, secondaryAction, sheetText, textInput } = kit
  const link = sig('')
  const busy = sig(false)
  const error = sig('')
  const connect = async () => {
    if (busy.get() || !link.get().trim()) return
    busy.set(true)
    error.set('')
    try {
      joined((await source.addPc(link.get().trim())).name)
    } catch (failure) {
      error.set(errorMessage(failure))
    } finally {
      busy.set(false)
    }
  }
  return div(
    { class: 'flex flex-col gap-2' },
    sheetText('Or paste a link from the other PC here.'),
    div(
      { class: 'flex items-center gap-2' },
      textInput({ placeholder: 'Pairing link', 'aria-label': 'Link from the other PC', bindValue: link, onKeyDown: keys({ Enter: () => void connect() }) }),
      secondaryAction({ disabled: () => busy.get() || !link.get().trim(), onClick: () => void connect() }, () => (busy.get() ? 'Connecting…' : 'Connect')),
    ),
    show(() => !!error.get(), () => errorText(error)),
  )
}

export const joinStep = (ctx: DevicesContext, source: DeviceSource, joined: (name: string) => void) => {
  const { kit } = ctx
  const { errorState, loadingState, sheetText } = kit
  const shown = new Set<number>()
  const { invite, error } = pairInvite(ctx, source.epoch, shown)
  effect(() => {
    const off = ctx.wire.on(pairUsed, ({ device, expires }) => {
      if (device.kind === 'pc' && shown.has(expires)) joined(device.name)
    })
    return () => void off()
  })
  const body = derive(() => ({ current: invite.get(), failure: error.get() }))
  return div(
    { class: 'flex flex-col gap-4' },
    sheetText('On the other PC, open Settings → Devices → Add a PC → Connect a PC that has sand, and paste this link there.'),
    dynamicChild(body, ({ current, failure }) => {
      if (current) return inviteBody(kit, current, source.listenOnLan, 'pc')
      if (failure) return errorState({ flush: true, text: `Couldn't create a link (${errorMessage(failure)}). Close this sheet and try again.` })
      return loadingState({ flush: true, text: 'Creating a link…' })
    }),
    pasteRow(kit, source, joined),
  )
}
