import type { Picture } from '../gallery'
import type { ViewerModel } from './model'
import type { Kit } from '@sand/ui-kit/contract'
import { disposeAll, div, dynamicChild, keys, onWindow, type Derive } from '@vaakx-dev/vrui'
import { viewerHead } from './head'
import { viewerStage } from './stage'
import { viewerStrip } from './strip'
import { zoomState } from './zoom'

const flipButton = ({ floatButton, icon }: Kit, side: 'left' | 'right', title: string, disabled: Derive<boolean>, onClick: () => void) =>
  div(
    { class: ['absolute top-1/2 hidden -translate-y-1/2 md:block', side === 'left' ? 'left-3' : 'right-3'] },
    floatButton({ size: 'md', title, 'aria-label': title, disabled, onClick }, icon(side, 16)),
  )

const imageView = (kit: Kit, model: ViewerModel, index: number, picture: Picture, close: () => void) => {
  const shown = model.images[index]
  if (!shown) return null
  const zoom = zoomState()
  const count = model.images.length > 1 ? `${index + 1} of ${model.images.length}` : ''
  return div(
    { class: 'flex min-h-0 flex-1 flex-col' },
    viewerHead(kit, shown, count, zoom, close),
    viewerStage(shown, picture, zoom, model.step, close),
  )
}

export const viewerDialog = (kit: Kit, model: ViewerModel, picture: Picture, close: () => void) => {
  const { dismissible, layer, returnFocus } = kit
  const previous = document.activeElement
  const many = model.images.length > 1
  return div(
    {
      role: 'dialog',
      'aria-label': 'Image viewer',
      tabIndex: -1,
      class: [layer.dialog, 'fixed inset-0 flex flex-col bg-neutral-950/90 px-safe py-safe outline-none backdrop-blur-md animate-fade'],
      onMount: node => {
        node.focus()
        onWindow<KeyboardEvent>(node, 'keydown', keys({ ArrowLeft: () => model.step(-1), ArrowRight: () => model.step(1) }))
        const stops = [dismissible(node, close), returnFocus(node, previous)]
        return () => disposeAll(stops)
      },
    },
    dynamicChild(model.current, index => imageView(kit, model, index, picture, close)),
    many && flipButton(kit, 'left', 'Previous (←)', model.atFirst, () => model.step(-1)),
    many && flipButton(kit, 'right', 'Next (→)', model.atLast, () => model.step(1)),
    many && viewerStrip(kit, model, picture),
  )
}
