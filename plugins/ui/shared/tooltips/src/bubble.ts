import { derive, div, dynamicChild, layer, resizeObserver, sig, untrack, type Sig } from '@sand/dom'
import { spotFor, type Spot } from './integrations/spot'
import type { Tip } from './model'

const px = (value: number | undefined) => (value === undefined ? null : `${value}px`)

const card = (tip: Sig<Tip | undefined>) => {
  const spot = sig<Spot | undefined>(undefined)
  const place = (node: Element) => {
    const anchor = untrack(() => tip.get()?.anchor)
    if (anchor) spot.set(spotFor(node, anchor))
  }
  return div(
    {
      role: 'tooltip',
      class: [
        layer.tooltip,
        'pointer-events-none fixed max-w-80 rounded-md bg-neutral-600 px-2 py-1 text-xs text-neutral-100 shadow-lg whitespace-pre-wrap wrap-anywhere animate-tip',
      ],
      style: {
        top: () => px(spot.get()?.top),
        left: () => px(spot.get()?.left),
        transformOrigin: () => (spot.get()?.above === false ? 'top center' : 'bottom center'),
      },
      onMount: node => void resizeObserver(node as Element, () => place(node as Element)),
    },
    () => tip.get()?.text ?? '',
  )
}

export const bubble = (tip: Sig<Tip | undefined>) =>
  dynamicChild(
    derive(() => tip.get()?.round),
    round => (round === undefined ? div({ hidden: true }) : card(tip)),
  )
