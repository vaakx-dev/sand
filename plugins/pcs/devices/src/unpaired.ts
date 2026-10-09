import type { WireState } from '@sand/protocol'
import { div, el, keys, overlay, p, place, secondaryAction, sheet, show, sig, textInput } from '@sand/dom'
import { parsePairLink } from '@sand/kit'
import type { Context, Dispose } from 'drydock'

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
    wrong.set(!follow(link.get()))
    if (!wrong.get()) link.set('')
  }
  return overlay(
    () => {},
    sheet(
      { 'aria-label': 'Pair this browser', class: 'max-w-md' },
      div(
        { class: 'flex flex-col gap-3 p-5' },
        el('h2', { class: 'text-sm font-semibold text-neutral-100' }, 'This browser isn’t paired with sand'),
        p({ class: 'text-sm text-neutral-400' }, 'On a paired device open Settings → Your PCs → Add a phone, or run sand on this PC.'),
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
  let unplace: Dispose | undefined
  const sync = (state: WireState) => {
    if (state === 'unpaired' && !unplace) unplace = place(ctx, 'overlay', unpairedView, 200)
    if (state !== 'unpaired' && unplace) {
      void unplace()
      unplace = undefined
    }
  }
  ctx.on('wire.state', sync)
  sync(ctx.wire.state())
  ctx.effect(() => () => {
    void unplace?.()
    unplace = undefined
  })
}
