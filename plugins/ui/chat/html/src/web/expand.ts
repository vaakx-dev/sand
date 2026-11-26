import type { SheetSpec } from '@sand/ui-shell/contract'
import type { Point, ZoomTarget } from '@sand/ui-kit/contract'
import { keys } from '@vaakx-dev/vrui'
import type { HtmlRenderEntry } from '../contract'
import { columnWidth } from '../page/limits'
import { hostPath } from '../page/protocol'
import type { FrameContext } from './context'
import { sandboxedFrame } from './integrations/frame'
import { connectPage } from './page'

const onScreen = (frame: HTMLIFrameElement, { x, y }: Point): Point => {
  const box = frame.getBoundingClientRect()
  const scale = box.width / columnWidth
  return { x: box.left + x * scale, y: box.top + y * scale }
}

const zoomFrom = (frame: HTMLIFrameElement, zoom: ZoomTarget): ZoomTarget => ({
  zoom: ({ factor, from, to }) => zoom.zoom({ factor, from: onScreen(frame, from), to: onScreen(frame, to) }),
  toggle: at => zoom.toggle(onScreen(frame, at)),
})

export const expandedPage = (ctx: FrameContext, data: HtmlRenderEntry, html: string, height: number): SheetSpec => {
  const { kit } = ctx
  const zoom = kit.fitZoom({ width: columnWidth, height })
  const frame = sandboxedFrame({ 'aria-label': data.title, src: hostPath, class: 'block h-full w-full border-0', onLoad: () => connection.show(html) })
  const connection = connectPage(ctx, frame, { zoom: zoomFrom(frame, zoom.control) })

  return {
    label: `Full screen ${data.title}`,
    look: 'viewer',
    onKeyDown: keys(zoom.control.shortcuts),
    title: data.title,
    head: () => kit.zoomControls(zoom.control),
    body: () => kit.zoomStage(zoom, { onMount: connection.listen }, frame),
  }
}
