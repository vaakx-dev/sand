import type { Picture, ThreadImage } from '../gallery'
import type { Zoom } from './zoom'
import { div, event, preventThen } from '@sand/dom'

const swipeDistance = 60

interface Drag {
  startX: number
  x: number
  y: number
}

export const viewerStage = (shown: ThreadImage, picture: Picture, zoom: Zoom, flip: (by: number) => void, close: () => void) => {
  let drag: Drag | undefined

  const release = (pointer: PointerEvent) => {
    const swiped = drag ? pointer.clientX - drag.startX : 0
    drag = undefined
    if (!zoom.zoomed.get() && Math.abs(swiped) > swipeDistance) flip(swiped > 0 ? -1 : 1)
  }

  const image = picture(shown.block, {
    class: ['max-h-full max-w-full select-none rounded-md object-contain shadow-xl', () => (zoom.zoomed.get() ? 'cursor-grab' : null)],
    draggable: false,
    style: { transform: zoom.transform, touchAction: 'none' },
    onDblClick: zoom.toggle,
    onPointerDown: pointer => {
      if (pointer.button !== 0) return
      image.setPointerCapture(pointer.pointerId)
      drag = { startX: pointer.clientX, x: pointer.clientX, y: pointer.clientY }
    },
    onPointerMove: pointer => {
      if (!drag || !zoom.zoomed.get()) return
      zoom.pan(pointer.clientX - drag.x, pointer.clientY - drag.y, image)
      drag = { ...drag, x: pointer.clientX, y: pointer.clientY }
    },
    onPointerUp: release,
    onPointerCancel: () => {
      drag = undefined
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
