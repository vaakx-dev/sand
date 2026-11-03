import type { Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild, keys, type Derive } from '@vaakx-dev/vrui'
import type { Draw } from '../gallery'
import { viewerHead } from './head'
import type { ViewerModel } from './model'
import { viewerStage } from './stage'
import { viewerStrip } from './strip'
import { zoomState } from './zoom'

const flipButton = ({ floatButton, icon }: Kit, side: 'left' | 'right', title: string, disabled: Derive<boolean>, onClick: () => void) =>
  div(
    { class: ['absolute top-1/2 hidden -translate-y-1/2 md:block', side === 'left' ? 'left-3' : 'right-3'] },
    floatButton({ size: 'md', title, 'aria-label': title, disabled, onClick }, icon(side, 16)),
  )

export const viewerDialog = (kit: Kit, model: ViewerModel, draw: Draw, close: () => void) => {
  const many = model.images.length > 1
  const zoom = zoomState()
  const go = (move: () => void) => {
    move()
    zoom.fit()
  }
  const back = () => go(() => model.step(-1))
  const next = () => go(() => model.step(1))
  const shortcuts = keys({
    ArrowLeft: back,
    ArrowRight: next,
    Home: () => go(model.first),
    End: () => go(model.last),
    '+': zoom.zoomIn,
    '=': zoom.zoomIn,
    '-': zoom.zoomOut,
    '0': zoom.fit,
  })

  return kit.viewerShell(
    { label: 'Image viewer', close, onKeyDown: shortcuts },
    dynamicChild(model.current, index => {
      const shown = model.images[index]
      if (!shown) return null
      const count = many ? `${index + 1} of ${model.images.length}` : ''
      return div(
        { class: 'flex min-h-0 flex-1 flex-col' },
        viewerHead(kit, shown, count, zoom, close),
        viewerStage(shown, draw, zoom, by => go(() => model.step(by)), close),
      )
    }),
    many && flipButton(kit, 'left', 'Previous (←)', model.atFirst, back),
    many && flipButton(kit, 'right', 'Next (→)', model.atLast, next),
    many && viewerStrip(kit, model, draw),
  )
}
