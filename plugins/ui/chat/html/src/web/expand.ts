import type { SheetSpec } from '@sand/ui-shell/contract'
import type { HtmlRenderEntry } from '../contract'
import { derive, div, keys, resizeObserver, sig } from '@vaakx-dev/vrui'
import { columnWidth } from '../page/limits'
import { hostPath } from '../page/protocol'
import type { FrameContext } from './context'
import { sandboxedFrame } from './integrations/frame'
import { connectPage } from './page'

const least = 0.25
const most = 4
const step = 1.4
const margin = 24

const clamp = (value: number) => Math.min(most, Math.max(least, value))

const zoomLevels = (height: number) => {
  const room = sig({ width: 0, height: 0 })
  const fitted = derive(() => {
    const { width, height: tall } = room.get()
    return width ? clamp(Math.min((width - 2 * margin) / columnWidth, (tall - 2 * margin) / height)) : 1
  })
  const chosen = sig<number | undefined>(undefined)
  const level = derive(() => chosen.get() ?? fitted.get())
  const zoomed = derive(() => chosen.get() !== undefined)
  return {
    room,
    level,
    canZoomOut: derive(() => level.get() > least),
    label: derive(() => (zoomed.get() ? `${Math.round(level.get() * 100)}%` : 'Fit')),
    zoomIn: () => chosen.set(clamp(level.get() * step)),
    zoomOut: () => chosen.set(clamp(level.get() / step)),
    fit: () => chosen.set(undefined),
  }
}

export const expandedPage = (ctx: FrameContext, data: HtmlRenderEntry, html: string, height: number): SheetSpec => {
  const { kit } = ctx
  const zoom = zoomLevels(height)
  const frame = sandboxedFrame({ 'aria-label': data.title, src: hostPath, class: 'block h-full w-full border-0', onLoad: () => connection.show(html) })
  const connection = connectPage(ctx, frame, {})

  return {
    label: `Full screen ${data.title}`,
    look: 'viewer',
    onKeyDown: keys({ '+': zoom.zoomIn, '=': zoom.zoomIn, '-': zoom.zoomOut, '0': zoom.fit }),
    title: data.title,
    head: () => kit.zoomControls(zoom),
    body: () =>
      div(
        {
          class: 'flex min-h-0 flex-1 overflow-auto',
          onMount: node => {
            resizeObserver(node, () => zoom.room.set({ width: node.clientWidth, height: node.clientHeight }))
          },
        },
        div({ class: 'm-auto shrink-0', onMount: connection.listen, style: { width: `${columnWidth}px`, height: `${height}px`, zoom: () => String(zoom.level.get()) } }, frame),
      ),
  }
}
