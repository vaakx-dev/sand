import type { Kit } from '@sand/ui-kit/contract'
import { div, span } from '@vaakx-dev/vrui'
import { senderNames, type Picture } from '../gallery'
import type { Zoom } from './zoom'

const dimensions = ({ source }: Picture) => {
  const block = 'block' in source ? source.block : undefined
  return block?.width && block.height ? `${block.width}×${block.height}` : undefined
}

const details = (shown: Picture) => [senderNames[shown.sender], dimensions(shown)].filter(Boolean).join(' · ')

export const viewerHead = (kit: Kit, shown: Picture, count: string, zoom: Zoom, close: () => void) =>
  kit.viewerBar(
    close,
    div({ class: 'flex min-w-0 flex-1 flex-col' }, kit.headTitle(2, shown.name ?? 'Image'), kit.metaLine(details(shown))),
    span({ class: 'hidden text-xs tabular-nums text-neutral-500 md:inline' }, count),
    kit.zoomControls({ label: zoom.label, canZoomOut: zoom.zoomed, zoomIn: zoom.zoomIn, zoomOut: zoom.zoomOut, fit: zoom.fit }),
  )
