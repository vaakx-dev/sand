import { derive, div, dynamicChild, span } from '@vaakx-dev/vrui'
import { ping } from '../integrations/motion'
import type { TabModel } from '../tab/model'
import { recent } from '../tab/recent'
import type { Screen } from './screen'

const cursorMs = 1500

export const agentCursor = (tab: TabModel, screen: Screen) => {
  const fresh = recent(tab.action, cursorMs)
  const spot = derive(() => {
    const point = tab.action.get()?.point
    const viewport = tab.state.get()?.viewport
    if (!point || !viewport?.width) return { left: 0, top: 0 }
    const image = screen.image(viewport)
    return {
      left: image.left + (point.x * image.width) / viewport.width,
      top: image.top + (point.y * image.width) / viewport.width,
    }
  })
  const marker = () =>
    div(
      {
        class: ['pointer-events-none absolute transition-opacity duration-500', () => (fresh.get() ? 'opacity-100' : 'opacity-0')],
        style: { left: () => spot.get().left, top: () => spot.get().top },
      },
      span({ class: 'absolute -left-3 -top-3 h-6 w-6 rounded-full bg-accent-500/40', onMount: ping }),
      span({ class: 'absolute -left-1 -top-1 h-2 w-2 rounded-full bg-accent-400 ring-2 ring-neutral-950' }),
    )
  return dynamicChild(
    tab.action.map(action => (action?.point ? action.seen : undefined)),
    seen => (seen === undefined ? null : marker()),
  )
}
