import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, media, onDocument, onWindow, show, sig, span } from '@vaakx-dev/vrui'
import { clearSelection, readSelection, type Picked } from './integrations/selection'
import { fallbackWidth, spotFor } from './place'

export const replyBubble = (kit: Kit, quote: (text: string) => void) => {
  const { icon, layer, plainButton } = kit
  const picked = sig<Picked | undefined>(undefined)
  const touch = media('(pointer: coarse)')
  const width = sig(fallbackWidth)
  const spot = derive(() => {
    const current = picked.get()
    return current && spotFor(current, touch.get(), { width: innerWidth, height: innerHeight }, width.get())
  })
  let dragging = false
  let pressing = false

  const update = () => {
    if (!pressing) picked.set(dragging ? undefined : readSelection())
  }

  const reply = () => {
    pressing = false
    const current = picked.get()
    if (!current) return
    clearSelection()
    picked.set(undefined)
    quote(current.text)
  }

  const bubble = () =>
    plainButton(
      {
        class: [
          layer.menu,
          'fixed inline-flex h-8 items-center gap-2 rounded-xl bg-neutral-800 px-3 text-sm text-neutral-100 shadow-xl hover:bg-neutral-700 animate-fade',
        ],
        style: () => ({ left: `${spot.get()?.left ?? 0}px`, top: `${spot.get()?.top ?? 0}px` }),
        onMount: el => width.set(el.offsetWidth || fallbackWidth),
        onPointerDown: event => {
          pressing = true
          if (event.pointerType === 'mouse') event.preventDefault()
        },
        onPointerLeave: event => {
          if (event.pointerType === 'mouse') pressing = false
        },
        onPointerCancel: () => {
          pressing = false
        },
        onClick: reply,
      },
      span({ class: 'inline-flex text-neutral-400' }, icon('reply', 'md')),
      'Quote in reply',
    )

  return div({
    onMount: owner => {
      onDocument(owner, 'selectionchange', update)
      onDocument<PointerEvent>(owner, 'pointerdown', event => {
        const outside = !(event.target instanceof Node && owner.contains(event.target))
        dragging = outside && event.pointerType === 'mouse'
        if (outside) pressing = false
      })
      onDocument(owner, 'pointerup', () => {
        dragging = false
        update()
      })
      onDocument<KeyboardEvent>(owner, 'keydown', event => {
        if (event.key === 'Escape') picked.set(undefined)
      })
      onWindow(owner, 'scroll', update, true)
      onWindow(owner, 'resize', update)
    },
  }, show(() => Boolean(picked.get()), bubble))
}
