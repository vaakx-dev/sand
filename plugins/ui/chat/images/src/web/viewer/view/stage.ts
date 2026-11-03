import type { Draw, Picture } from '../gallery'
import type { Zoom } from './zoom'
import { div, event, preventThen } from '@vaakx-dev/vrui'

const swipeDistance = 60

interface Drag {
  image: HTMLElement
  startX: number
  startY: number
  x: number
  y: number
}

export const viewerStage = (shown: Picture, draw: Draw, zoom: Zoom, flip: (by: number) => void, close: () => void) => {
  let drag: Drag | undefined

  const release = (pointer: PointerEvent) => {
    const dx = drag ? pointer.clientX - drag.startX : 0
    const dy = drag ? pointer.clientY - drag.startY : 0
    drag = undefined
    if (!zoom.zoomed.get() && Math.abs(dx) > swipeDistance && Math.abs(dx) > Math.abs(dy)) flip(dx > 0 ? -1 : 1)
  }

  const image = draw(shown, {
    class: ['max-h-full max-w-full touch-none select-none rounded-md object-contain', () => (zoom.zoomed.get() ? 'cursor-grab' : null)],
    props: {
      draggable: false,
      style: { transform: zoom.transform },
      onDblClick: zoom.toggle,
      onPointerDown: pointer => {
        const target = pointer.currentTarget
        if (pointer.button !== 0 || !(target instanceof HTMLElement)) return
        target.setPointerCapture(pointer.pointerId)
        drag = { image: target, startX: pointer.clientX, startY: pointer.clientY, x: pointer.clientX, y: pointer.clientY }
      },
      onPointerMove: pointer => {
        if (!drag || !zoom.zoomed.get()) return
        zoom.pan(pointer.clientX - drag.x, pointer.clientY - drag.y, drag.image)
        drag = { ...drag, x: pointer.clientX, y: pointer.clientY }
      },
      onPointerUp: release,
      onPointerCancel: () => {
        drag = undefined
      },
    },
  })

  return div(
    {
      class: 'flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 pb-2 md:px-16',
      onMouseDown: event(close, { self: true }),
      onWheel: preventThen((wheel: WheelEvent) => zoom.wheel(wheel.deltaY)),
    },
    image,
  )
}
