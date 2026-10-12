import type { ImageBlock } from '@sand/messages'
import type { ThreadImage } from '../gallery'
import type { Zoom } from './zoom'
import { closeButton, div, headTitle, icon, iconButton, paneHead, quietButton, span } from '@sand/dom'
import { senderNames } from '../gallery'

const dimensions = (block: ImageBlock) => (typeof block.data !== 'string' && block.width && block.height ? `${block.width}×${block.height}` : undefined)

const details = ({ block, sender }: ThreadImage) => [senderNames[sender], dimensions(block)].filter(Boolean).join(' · ')

const zoomControls = (zoom: Zoom) =>
  div(
    { class: 'flex items-center' },
    iconButton({ title: 'Zoom out', disabled: () => !zoom.zoomed.get(), onClick: zoom.zoomOut }, icon('zoom-out', 16)),
    quietButton({ title: 'Fit to screen', class: 'min-w-12 tabular-nums', onClick: zoom.fit }, zoom.label),
    iconButton({ title: 'Zoom in', onClick: zoom.zoomIn }, icon('zoom-in', 16)),
  )

export const viewerHead = (shown: ThreadImage, count: string, zoom: Zoom, close: () => void) =>
  paneHead(
    {},
    div(
      { class: 'flex min-w-0 flex-1 flex-col' },
      headTitle(2, shown.block.name ?? 'Image'),
      span({ class: 'truncate text-xs text-neutral-500' }, details(shown)),
    ),
    span({ class: 'hidden text-xs tabular-nums text-neutral-500 md:inline' }, count),
    zoomControls(zoom),
    closeButton({ onClick: close }),
  )
