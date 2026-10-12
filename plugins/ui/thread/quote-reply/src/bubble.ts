import { derive, div, icon, layer, media, onDocument, onWindow, plainButton, show, sig, span } from '@sand/dom'
import { clearSelection, readSelection, type Picked } from './integrations/selection'
import { fallbackWidth, spotFor, type Spot } from './place'

const tail = (spot: () => Spot | undefined) =>
  span({ class: ['absolute left-4 h-2 w-2 rotate-45 bg-neutral-800 group-hover:bg-neutral-700', () => (spot()?.under ? '-top-1' : '-bottom-1')] })

export const replyBubble = (quote: (text: string) => void) => {
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
          'group fixed inline-flex h-8 items-center gap-2 rounded-xl bg-neutral-800 px-3 text-sm text-neutral-100 shadow-lg ring-1 ring-neutral-700 hover:bg-neutral-700 animate-pop',
        ],
        style: () => ({ left: `${spot.get()?.left ?? 0}px`, top: `${spot.get()?.top ?? 0}px` }),
        title: 'Quote in reply',
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
      tail(() => spot.get()),
      icon('reply', 16),
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
