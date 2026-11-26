import { derive, div, dynamicChild, list, type Sig } from '@vaakx-dev/vrui'
import { screenKey } from './address'
import { asideCovers } from './cover'
import { dismissDrawer, scrim } from './drawer'
import { phoneFrame } from './frames'
import type { Frame } from './history'
import type { Model } from './model'
import { phoneSidebar } from './sidebar'

const keyOf = ({ route }: Frame) => screenKey(route)

const placeOf = (model: Model, top: boolean) => {
  const at = model.leaving.at()
  if (top) return { zIndex: '1', translate: `${at * 100}% 0`, visibility: 'visible' }
  return { zIndex: '0', translate: 'none', visibility: at > 0 ? 'visible' : 'hidden' }
}

const frameView = (model: Model) => (frame: Sig<Frame>) => {
  const key = keyOf(frame.get())
  const top = () => screenKey(model.current.get()) === key
  return div(
    { 'data-screen': key, class: 'absolute inset-0 isolate flex flex-col bg-neutral-900', inert: () => !top(), style: () => placeOf(model, top()) },
    dynamicChild(
      derive(() => frame.get().built),
      built => phoneFrame(model, built, () => frame.get().route),
    ),
  )
}

export const phoneView = (model: Model) => {
  const view = div(
    { class: 'relative flex min-h-0 min-w-0 flex-1 flex-col', style: { overflow: 'clip' } },
    list(model.frames, keyOf, frameView(model), div({ class: 'relative isolate flex min-h-0 min-w-0 flex-1 flex-col', inert: () => model.covered.get() })),
    asideCovers(model),
    scrim(model),
    phoneSidebar(model),
  )
  dismissDrawer(model, view)
  return view
}
