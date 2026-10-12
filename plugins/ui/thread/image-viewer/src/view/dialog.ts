import type { Picture } from '../gallery'
import type { ViewerModel } from './model'
import { disposeAll, dismissible, div, dynamicChild, floatButton, icon, keys, layer, onWindow, returnFocus, type Derive } from '@sand/dom'
import { viewerHead } from './head'
import { viewerStage } from './stage'
import { viewerStrip } from './strip'
import { zoomState } from './zoom'

const flipButton = (side: 'left' | 'right', title: string, disabled: Derive<boolean>, onClick: () => void) =>
  div(
    { class: ['absolute top-1/2 hidden -translate-y-1/2 md:block', side === 'left' ? 'left-3' : 'right-3'] },
    floatButton({ size: 'md', title, 'aria-label': title, disabled, onClick }, icon(side, 16)),
  )

const imageView = (model: ViewerModel, index: number, picture: Picture, close: () => void) => {
  const shown = model.images[index]
  if (!shown) return null
  const zoom = zoomState()
  const count = model.images.length > 1 ? `${index + 1} of ${model.images.length}` : ''
  return div(
    { class: 'flex min-h-0 flex-1 flex-col' },
    viewerHead(shown, count, zoom, close),
    viewerStage(shown, picture, zoom, model.step, close),
  )
}

export const viewerDialog = (model: ViewerModel, picture: Picture, close: () => void) => {
  const previous = document.activeElement
  const many = model.images.length > 1
  return div(
    {
      role: 'dialog',
      'aria-label': 'Image viewer',
      tabIndex: -1,
      class: [layer.dialog, 'fixed inset-0 flex flex-col bg-neutral-950/90 outline-none backdrop-blur-md animate-fade'],
      style: { padding: 'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)' },
      onMount: node => {
        node.focus()
        onWindow<KeyboardEvent>(node, 'keydown', keys({ ArrowLeft: () => model.step(-1), ArrowRight: () => model.step(1) }))
        const stops = [dismissible(node, close), returnFocus(node, previous)]
        return () => disposeAll(stops)
      },
    },
    dynamicChild(model.current, index => imageView(model, index, picture, close)),
    many && flipButton('left', 'Previous (←)', model.atFirst, () => model.step(-1)),
    many && flipButton('right', 'Next (→)', model.atLast, () => model.step(1)),
    many && viewerStrip(model, picture),
  )
}
