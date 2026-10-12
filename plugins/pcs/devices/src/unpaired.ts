import type { WireState } from '@sand/web-client/contract'
import { errorText, keys, note, overlay, primaryAction, sheet, sheetBody, sheetFoot, sheetHead, show, sig, textInput } from '@sand/dom'
import { parsePairLink } from '@sand/kit'
import type { Context } from 'drydock'
import { overlaySlot } from './overlay-slot'

const follow = (text: string) => {
  const link = parsePairLink(text)
  if (!link) return false
  if (link.url === location.origin) location.hash = `pair=${encodeURIComponent(link.secret)}`
  else location.href = text.trim()
  return true
}

const unpairedView = () => {
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
        note('On a paired device open Settings → Devices → Add a phone, or run sand on this PC.'),
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

export const unpairedOverlay = (ctx: Context<'wire'>) => {
  const slot = overlaySlot(ctx, 200)
  const sync = (state: WireState) => {
    if (state !== 'unpaired') return slot.close()
    if (!slot.isOpen()) slot.open(unpairedView)
  }
  ctx.on('wire.state', sync)
  sync(ctx.wire.state())
}
