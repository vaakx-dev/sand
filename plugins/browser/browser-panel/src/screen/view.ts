import type { Point } from '@sand/browser-engine/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { canvas, div, show, type Child, type Sig } from '@vaakx-dev/vrui'
import type { TabModel } from '../tab/model'
import { agentCursor } from './cursor'
import { emptyScreen } from './empty'
import { screenInput } from './input/handlers'
import { liveCanvas } from './live'
import type { Screen } from './screen'

export interface ScreenParts {
  tab: TabModel
  screen: Screen
  visible: Sig<boolean>
  picking: Sig<boolean>
  driving: () => boolean
  pickAt(point: Point): void
}

export const screenView = (kit: Kit, parts: ScreenParts, ...overlays: Child[]) =>
  div(
    { class: 'relative min-h-0 flex-1 overflow-hidden bg-neutral-900' },
    canvas({
      tabIndex: 0,
      'aria-label': 'Browser page',
      class: [
        'absolute inset-0 h-full w-full outline-none select-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-600',
        () => (parts.picking.get() ? 'cursor-crosshair' : ''),
      ],
      style: { touchAction: 'none' },
      onMount: node => liveCanvas(node as HTMLCanvasElement, parts.tab, parts.screen, parts.visible),
      ...screenInput(parts),
    }),
    div({
      class: [
        'pointer-events-none absolute inset-0 ring-2 ring-inset ring-accent-500 transition-opacity duration-300',
        () => (parts.driving() ? 'opacity-100' : 'opacity-0'),
      ],
    }),
    agentCursor(parts.tab, parts.screen),
    show(
      () => !parts.tab.open.get(),
      () => emptyScreen(kit),
    ),
    ...overlays,
  )
