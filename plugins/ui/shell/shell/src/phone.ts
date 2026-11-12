import { derive, div, dynamicChild } from '@vaakx-dev/vrui'
import { asideCovers } from './cover'
import { dismissDrawer, scrim } from './drawer'
import { phoneFrame } from './frames'
import type { Model } from './model'
import { phoneSidebar } from './sidebar'

export const phoneView = (model: Model) => {
  const screen = derive(model.screen)
  const view = div(
    { class: 'relative flex min-h-0 min-w-0 flex-1 flex-col', style: { overflow: 'clip' } },
    div(
      { class: 'isolate flex min-h-0 min-w-0 flex-1 flex-col', inert: () => model.covered.get() },
      dynamicChild(screen, built => phoneFrame(model, built)),
    ),
    asideCovers(model),
    scrim(model),
    phoneSidebar(model),
  )
  dismissDrawer(model, view)
  return view
}
