import type { SheetSpec } from '@sand/ui-shell/contract'
import type { HtmlRenderEntry } from '../contract'
import { columnWidth } from '../page/limits'
import { hostPath } from '../page/protocol'
import type { FrameContext } from './context'
import { sandboxedFrame } from './integrations/frame'
import { connectPage } from './page'

export const expandedPage = (ctx: FrameContext, data: HtmlRenderEntry, html: string, height: number): SheetSpec => {
  const { kit } = ctx
  const zoom = kit.fitZoom({ width: columnWidth, height })
  const frame = sandboxedFrame({ 'aria-label': data.title, src: hostPath, class: 'block h-full w-full border-0', onLoad: () => connection.show(html) })
  const connection = connectPage(ctx, frame, {})

  return {
    label: `Full screen ${data.title}`,
    look: 'viewer',
    onKeyDown: zoom.keys,
    title: data.title,
    head: () => kit.zoomControls(zoom),
    body: () => kit.zoomStage(zoom, { onMount: connection.listen }, frame),
  }
}
