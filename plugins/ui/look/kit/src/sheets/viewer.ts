import { div, read, type Child, type MaybeReactive, type Props } from '@vaakx-dev/vrui'
import { iconButton, quietButton } from '../buttons/button'
import { icon } from '../icons/lucide'
import { layer } from '../layer'
import { modal } from '../layers/stack'

export interface ViewerShellProps extends Omit<Props<HTMLDivElement>, 'label'> {
  label: MaybeReactive<string>
  close(): void
}

export const viewerShell = ({ label, close, class: extra, ...props }: ViewerShellProps, ...children: Child[]) => {
  const previous = document.activeElement
  return div(
    {
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': label,
      tabIndex: -1,
      ...props,
      class: [layer.dialog, 'fixed inset-0 flex flex-col bg-neutral-950/95 px-safe py-safe outline-none backdrop-blur-md animate-fade', extra],
      onMount: node => {
        node.focus()
        return modal(node, close, previous)
      },
    },
    ...children,
  )
}

export interface ZoomView {
  label: MaybeReactive<string>
  canZoomOut: MaybeReactive<boolean>
  zoomIn(): void
  zoomOut(): void
  fit(): void
}

export const zoomControls = (zoom: ZoomView) =>
  div(
    { class: 'flex items-center' },
    iconButton({ title: 'Zoom out', 'aria-label': 'Zoom out', disabled: () => !read(zoom.canZoomOut), onClick: zoom.zoomOut }, icon('zoom-out', 'md')),
    quietButton({ title: 'Fit to screen', class: 'min-w-12 tabular-nums', onClick: zoom.fit }, zoom.label),
    iconButton({ title: 'Zoom in', 'aria-label': 'Zoom in', onClick: zoom.zoomIn }, icon('zoom-in', 'md')),
  )
