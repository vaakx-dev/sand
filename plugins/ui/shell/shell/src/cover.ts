import { div, list, type Sig } from '@vaakx-dev/vrui'
import { asideScreen } from './aside'
import type { Aside } from './contract'
import type { Axis, Model } from './model'

const along = (axis: Axis, length: string) => (axis === 'y' ? `0 ${length}` : `${length} 0`)

const offset = (model: Model, spec: Aside) => ({ translate: along(model.axisOf(spec), `${(1 - model.coverSlide(spec.id).at()) * 100}%`) })

const coverView = (model: Model) => (spec: Sig<Aside>) => {
  const { id } = spec.get()
  return div(
    {
      class: 'absolute inset-0 flex flex-col bg-neutral-950',
      style: () => ({ overflow: 'clip', ...offset(model, spec.get()) }),
      inert: () => model.coverAside.get()?.id !== id,
    },
    asideScreen(model, spec.get()),
  )
}

export const asideCovers = (model: Model) => list(model.covers, spec => spec.id, coverView(model), div({ class: 'contents' }))
