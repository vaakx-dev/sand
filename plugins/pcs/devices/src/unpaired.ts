import type { WireState } from '@sand/web-client/contract'
import { div, h2, keys, overlay, p, secondaryAction, sheet, show, sig, textInput } from '@sand/dom'
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
      { 'aria-label': 'Pair this browser', class: 'max-w-md' },
      div(
        { class: 'flex flex-col gap-3 p-5' },
        h2({ class: 'text-sm font-semibold text-neutral-100' }, 'This browser isn’t paired with sand'),
        p({ class: 'text-sm text-neutral-400' }, 'On a paired device open Settings → Your devices → Add a phone, or run sand on this PC.'),
        div(
          { class: 'flex flex-wrap items-center gap-2' },
          textInput({
            class: 'min-w-40 flex-1',
            placeholder: 'Paste a pairing link',
            'aria-label': 'Pairing link',
            bindValue: link,
            onInput: () => wrong.set(false),
            onKeyDown: keys({ Enter: submit }),
          }),
          secondaryAction({ disabled: () => !link.get().trim(), onClick: submit }, 'Pair'),
        ),
        show(wrong, () => p({ class: 'text-xs text-danger-400' }, 'That isn’t a pairing link. It ends in #pair=…')),
      ),
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
