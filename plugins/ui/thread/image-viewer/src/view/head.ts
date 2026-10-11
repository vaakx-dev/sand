import type { ImageBlock } from '@sand/messages'
import type { ThreadImage } from '../gallery'
import type { Zoom } from './zoom'
import { div, icon, iconButton, plainButton, span } from '@sand/dom'
import { senderNames } from '../gallery'

const dimensions = (block: ImageBlock) => (typeof block.data !== 'string' && block.width && block.height ? `${block.width}×${block.height}` : undefined)

const details = ({ block, sender }: ThreadImage) => [senderNames[sender], dimensions(block)].filter(Boolean).join(' · ')

const zoomControls = (zoom: Zoom) =>
  div(
    { class: 'flex items-center' },
    iconButton({ title: 'Zoom out', disabled: () => !zoom.zoomed.get(), onClick: zoom.zoomOut }, icon('zoom-out')),
    plainButton(
      { title: 'Fit to screen', class: 'h-8 min-w-12 rounded-lg px-1 text-xs tabular-nums text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100', onClick: zoom.fit },
      zoom.label,
    ),
    iconButton({ title: 'Zoom in', onClick: zoom.zoomIn }, icon('zoom-in')),
  )

export const viewerHead = (shown: ThreadImage, count: string, zoom: Zoom, close: () => void) =>
  div(
    { class: 'flex h-12 shrink-0 items-center gap-3 pr-3 pl-5' },
    div(
      { class: 'flex min-w-0 flex-1 flex-col' },
      span({ class: 'truncate text-sm font-medium text-neutral-100' }, shown.block.name ?? 'Image'),
      span({ class: 'truncate text-xs text-neutral-500' }, details(shown)),
    ),
    span({ class: 'hidden text-xs tabular-nums text-neutral-500 md:inline' }, count),
    zoomControls(zoom),
    iconButton({ title: 'Close (Esc)', onClick: close }, icon('x')),
  )
