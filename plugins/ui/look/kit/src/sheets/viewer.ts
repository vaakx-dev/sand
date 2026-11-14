import { derive, div, keys, read, resizeObserver, sig, type Child, type MaybeReactive, type Props } from '@vaakx-dev/vrui'
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

export interface Size {
  width: number
  height: number
}

const LEAST_ZOOM = 0.25
const MOST_ZOOM = 4
const ZOOM_STEP = 1.4
const STAGE_MARGIN = 24

const clampZoom = (level: number) => Math.min(MOST_ZOOM, Math.max(LEAST_ZOOM, level))

export const fitZoom = (size: Size) => {
  const room = sig<Size>({ width: 0, height: 0 })
  const fitted = derive(() => {
    const { width, height } = room.get()
    return width ? clampZoom(Math.min((width - 2 * STAGE_MARGIN) / size.width, (height - 2 * STAGE_MARGIN) / size.height)) : 1
  })
  const chosen = sig<number | undefined>(undefined)
  const level = derive(() => chosen.get() ?? fitted.get())
  const zoomIn = () => chosen.set(clampZoom(level.get() * ZOOM_STEP))
  const zoomOut = () => chosen.set(clampZoom(level.get() / ZOOM_STEP))
  const fit = () => chosen.set(undefined)
  return {
    size,
    room,
    level,
    canZoomOut: derive(() => level.get() > LEAST_ZOOM),
    label: derive(() => (chosen.get() === undefined ? 'Fit' : `${Math.round(level.get() * 100)}%`)),
    zoomIn,
    zoomOut,
    fit,
    keys: keys({ '+': zoomIn, '=': zoomIn, '-': zoomOut, '0': fit }),
  }
}

export type FitZoom = ReturnType<typeof fitZoom>

export const zoomStage = (zoom: FitZoom, props: Props<HTMLDivElement>, ...children: Child[]) =>
  div(
    {
      class: 'flex min-h-0 flex-1 overflow-auto',
      onMount: node => {
        resizeObserver(node, () => zoom.room.set({ width: node.clientWidth, height: node.clientHeight }))
      },
    },
    div({ ...props, class: 'm-auto shrink-0', style: { width: `${zoom.size.width}px`, height: `${zoom.size.height}px`, zoom: () => String(zoom.level.get()) } }, ...children),
  )

export const zoomControls = (zoom: ZoomView) =>
  div(
    { class: 'flex items-center' },
    iconButton({ title: 'Zoom out', 'aria-label': 'Zoom out', disabled: () => !read(zoom.canZoomOut), onClick: zoom.zoomOut }, icon('zoom-out', 'md')),
    quietButton({ title: 'Fit to screen', class: 'min-w-12 tabular-nums', onClick: zoom.fit }, zoom.label),
    iconButton({ title: 'Zoom in', 'aria-label': 'Zoom in', onClick: zoom.zoomIn }, icon('zoom-in', 'md')),
  )
