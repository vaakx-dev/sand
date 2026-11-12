import type { Kit } from '@sand/ui-kit/contract'
import { div } from '@vaakx-dev/vrui'
import { senderNames, type Picture } from '../gallery'
import type { Zoom } from './zoom'

const dimensions = ({ source }: Picture) => {
  const block = 'block' in source ? source.block : undefined
  return block?.width && block.height ? `${block.width}×${block.height}` : undefined
}

const details = (shown: Picture) => [senderNames[shown.sender], dimensions(shown)].filter(Boolean).join(' · ')

export const viewerTitle = (shown: Picture | undefined) => shown?.name ?? 'Image'

export const viewerTools = (kit: Kit, shown: Picture | undefined, count: string, zoom: Zoom) => [
  div({ class: 'hidden items-center gap-2 tabular-nums md:flex' }, kit.metaLine([shown ? details(shown) : '', count].filter(Boolean).join(' · '))),
  kit.zoomControls({ label: zoom.label, canZoomOut: zoom.zoomed, zoomIn: zoom.zoomIn, zoomOut: zoom.zoomOut, fit: zoom.fit }),
]
