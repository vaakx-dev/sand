import { div } from '@vaakx-dev/vrui'
import { iconButton, quietButton } from '../buttons/button'
import { icon } from '../icons/lucide'
import type { Surface } from '../surface'
import type { ZoomControl } from './control'

interface ZoomControlsOptions {
  surface?: Surface
}

const zoomControls = (zoom: ZoomControl, { surface }: ZoomControlsOptions = {}) =>
  div(
    { class: 'flex items-center' },
    iconButton({ title: 'Zoom out', 'aria-label': 'Zoom out', surface, disabled: () => !zoom.canZoomOut.get(), onClick: zoom.zoomOut }, icon('zoom-out', 'md')),
    quietButton({ title: 'Fit to screen', class: 'min-w-12 tabular-nums', surface, onClick: zoom.fit }, zoom.label),
    iconButton({ title: 'Zoom in', 'aria-label': 'Zoom in', surface, onClick: zoom.zoomIn }, icon('zoom-in', 'md')),
  )

export { zoomControls }
