import type { Point, Viewport } from '@sand/browser-engine/contract'
import { sig, untrack } from '@sand/dom'
import { fitRect, sameSize, type Size } from './fit'

export const screenState = () => {
  const frame = sig<Size | undefined>(undefined)
  const box = sig<Size>({ width: 0, height: 0 })
  let last: Uint8Array<ArrayBuffer> | undefined

  const drawn = (node: Element, viewport: Viewport) => {
    const rect = node.getBoundingClientRect()
    return { rect, image: fitRect(rect, untrack(() => frame.get()) ?? viewport) }
  }

  return {
    box,
    last: () => last,
    framed(bytes: Uint8Array<ArrayBuffer>, size: Size) {
      last = bytes
      if (!sameSize(size, frame.get())) frame.set(size)
    },
    reset() {
      last = undefined
      frame.set(undefined)
    },
    measure(node: Element) {
      const { width, height } = node.getBoundingClientRect()
      if (!sameSize({ width, height }, box.get())) box.set({ width, height })
    },
    image: (viewport: Viewport) => fitRect(box.get(), frame.get() ?? viewport),
    toPage(event: MouseEvent, node: Element, viewport: Viewport): Point {
      const { rect, image } = drawn(node, viewport)
      const scale = image.width ? viewport.width / image.width : 1
      return {
        x: Math.round((event.clientX - rect.left - image.left) * scale),
        y: Math.round((event.clientY - rect.top - image.top) * scale),
      }
    },
    ratio(node: Element, viewport: Viewport) {
      const { image } = drawn(node, viewport)
      return image.width ? viewport.width / image.width : 1
    },
  }
}

export type Screen = ReturnType<typeof screenState>
