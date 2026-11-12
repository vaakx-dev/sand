import { derive, div, dynamicChild } from '@vaakx-dev/vrui'
import { dismissDrawer, drawerLook, drawerOffset, scrim } from './drawer'
import { deskFrames } from './frames'
import type { Model } from './model'
import { sidebar } from './sidebar'

export const deskView = (model: Model) => {
  const screen = derive(model.screen)
  const view = div(
    { class: 'relative flex min-h-0 min-w-0 flex-1' },
    scrim(model),
    sidebar(model, screen, { class: () => drawerLook(model), style: () => drawerOffset(model) }),
    dynamicChild(screen, built => (built ? deskFrames(model, built) : div({ class: 'flex-1' }))),
  )
  dismissDrawer(model, view)
  return view
}
