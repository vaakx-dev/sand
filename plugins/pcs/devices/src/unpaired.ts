import { parsePairLink } from '@sand/host-remotes/pairing'
import type { Kit } from '@sand/ui-kit/contract'
import { wireState, type WireState } from '@sand/web-client/contract'
import { keys, show, sig } from '@vaakx-dev/vrui'
import type { DevicesContext } from './inject'
import { overlaySlot } from './overlay-slot'

const follow = (text: string) => {
  const link = parsePairLink(text)
  if (!link) return false
  if (link.url === location.origin) location.hash = `pair=${encodeURIComponent(link.secret)}`
  else location.href = text.trim()
  return true
}

const unpairedView = (kit: Kit) => {
  const { errorText, overlay, primaryAction, sheet, sheetBody, sheetFoot, sheetHead, sheetText, textInput } = kit
  const link = sig('')
  const wrong = sig(false)
  const submit = () => {
    const followed = follow(link.get())
    wrong.set(!followed)
    if (followed) link.set('')
  }
  return overlay(
    () => {},
    sheet(
      { 'aria-label': 'Pair this browser', size: 'sm' },
      sheetHead({ title: 'This browser isn’t paired with sand' }),
      sheetBody(
        {},
        sheetText('On a paired device, open Settings → Devices → Add a phone and paste its link here. Or run sand on this PC.'),
        textInput({
          placeholder: 'Paste a pairing link',
          'aria-label': 'Pairing link',
          bindValue: link,
          onInput: () => wrong.set(false),
          onKeyDown: keys({ Enter: submit }),
        }),
        show(wrong, () => errorText('That isn’t a pairing link. It ends in #pair=…')),
      ),
      sheetFoot(primaryAction({ disabled: () => !link.get().trim(), onClick: submit }, 'Pair')),
    ),
  )
}

export const unpairedOverlay = (ctx: DevicesContext) => {
  const slot = overlaySlot(ctx, 200)
  const sync = (state: WireState) => {
    if (state !== 'unpaired') return slot.close()
    if (!slot.isOpen()) slot.open(() => unpairedView(ctx.kit))
  }
  ctx.on(wireState, sync)
  sync(ctx.wire.state())
}
