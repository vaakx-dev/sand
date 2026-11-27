import type { SheetSpec } from '@sand/ui-shell/contract'
import type { Point, ZoomChange, ZoomTarget } from '@sand/ui-kit/contract'
import { keys, sig } from '@vaakx-dev/vrui'
import type { HtmlRenderEntry } from '../contract'
import { columnWidth } from '../page/limits'
import { hostPath } from '../page/protocol'
import type { FrameContext } from './context'
import { pageHeightWithin } from './heights'
import { sandboxedFrame, type FrameZoom } from './integrations/frame'
import { connectPage } from './page'

const inHost = (frame: HTMLIFrameElement, { x, y }: Point): Point => {
  const box = frame.getBoundingClientRect()
  const scale = box.width / columnWidth
  return { x: box.left + x * scale, y: box.top + y * scale }
}

class ScreenZoom implements FrameZoom {
  readonly #frame: HTMLIFrameElement
  readonly #target: ZoomTarget
  #offset: Point = { x: 0, y: 0 }

  constructor(frame: HTMLIFrameElement, target: ZoomTarget) {
    this.#frame = frame
    this.#target = target
  }

  anchor = (screen: Point, page: Point) => {
    const at = inHost(this.#frame, page)
    this.#offset = { x: screen.x - at.x, y: screen.y - at.y }
  }

  zoom = ({ factor, from, to }: ZoomChange) => this.#target.zoom({ factor, from: this.#inHost(from), to: this.#inHost(to) })

  toggle = (at: Point) => this.#target.toggle(this.#inHost(at))

  #inHost(screen: Point): Point {
    return { x: screen.x - this.#offset.x, y: screen.y - this.#offset.y }
  }
}

export const expandedPage = (ctx: FrameContext, data: HtmlRenderEntry, html: string, height: number): SheetSpec => {
  const { kit } = ctx
  const size = sig({ width: columnWidth, height })
  const zoom = kit.fitZoom(size)
  const frame = sandboxedFrame({ 'aria-label': data.title, src: hostPath, class: 'block h-full w-full border-0', onLoad: () => connection.show(html) })
  const connection = connectPage(ctx, frame, {
    zoom: new ScreenZoom(frame, zoom.control),
    resize: next => size.set({ width: columnWidth, height: pageHeightWithin(next) }),
  })

  return {
    label: `Full screen ${data.title}`,
    look: 'viewer',
    onKeyDown: keys(zoom.control.shortcuts),
    title: data.title,
    head: () => kit.zoomControls(zoom.control),
    body: () => kit.zoomStage(zoom, { onMount: connection.listen }, frame),
  }
}
