import type { ImageBlock } from '@sand/chats/contract'
import type { ThreadImage } from '../gallery'
import type { Zoom } from './zoom'
import type { Kit } from '@sand/ui-kit/contract'
import { div, span } from '@vaakx-dev/vrui'
import { senderNames } from '../gallery'

const dimensions = (block: ImageBlock) => (block.width && block.height ? `${block.width}×${block.height}` : undefined)

const details = ({ block, sender }: ThreadImage) => [senderNames[sender], dimensions(block)].filter(Boolean).join(' · ')

const zoomControls = ({ icon, iconButton, quietButton }: Kit, zoom: Zoom) =>
  div(
    { class: 'flex items-center' },
    iconButton({ title: 'Zoom out', 'aria-label': 'Zoom out', disabled: () => !zoom.zoomed.get(), onClick: zoom.zoomOut }, icon('zoom-out', 'md')),
    quietButton({ title: 'Fit to screen', class: 'min-w-12 tabular-nums', onClick: zoom.fit }, zoom.label),
    iconButton({ title: 'Zoom in', 'aria-label': 'Zoom in', onClick: zoom.zoomIn }, icon('zoom-in', 'md')),
  )

export const viewerHead = (kit: Kit, shown: ThreadImage, count: string, zoom: Zoom, close: () => void) => {
  const { closeButton, headTitle, metaLine, paneHead } = kit
  return paneHead(
    {},
    div({ class: 'flex min-w-0 flex-1 flex-col' }, headTitle(2, shown.block.name ?? 'Image'), metaLine(details(shown))),
    span({ class: 'hidden text-xs tabular-nums text-neutral-500 md:inline' }, count),
    zoomControls(kit, zoom),
    closeButton({ onClick: close }),
  )
}
