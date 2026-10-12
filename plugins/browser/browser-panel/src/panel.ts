import type { Point } from '@sand/browser-engine/contract'
import type { UserContent } from '@sand/messages'
import type { Kit } from '@sand/ui-kit/contract'
import { div, effect, show, sig, untrack, type Sig } from '@vaakx-dev/vrui'
import { pickedContent, screenshotContent } from './attach/content'
import { consoleDrawer } from './console/view'
import { screenState } from './screen/screen'
import { screenView } from './screen/view'
import { controlMode } from './status/mode'
import { statusBar } from './status/view'
import type { TabModel } from './tab/model'
import { toolbar } from './toolbar/view'

export interface PanelParts {
  tab: TabModel
  visible: Sig<boolean>
  attach(content: UserContent[]): void
  tell(text: string): void
  guard(failed: string, work: () => Promise<unknown>): void
}

export const browserPanel = (kit: Kit, { tab, visible, attach, tell, guard }: PanelParts) => {
  const screen = screenState()
  const picking = sig(false)
  const consoleOpen = sig(false)
  const mode = controlMode(tab)

  const leavePick = () => {
    if (!picking.get()) return
    picking.set(false)
    void tab.inspect().catch(() => undefined)
  }

  const pickAt = (point: Point) => {
    leavePick()
    guard('Could not pick the element', async () => {
      const picked = await tab.pick(point)
      if (picked) attach(pickedContent(picked))
    })
  }

  const screenshot = () => {
    const frame = screen.last()
    if (frame) attach([screenshotContent(frame)])
    else tell('No frame to capture yet')
  }

  effect(() => {
    tab.key.get()
    if (!tab.open.get()) untrack(leavePick)
  })

  return div(
    {
      class: 'flex h-full min-h-0 flex-col bg-neutral-950',
      onKeyDown: event => {
        if (event.key !== 'Escape' || !picking.get()) return
        event.preventDefault()
        leavePick()
      },
    },
    toolbar(kit, {
      tab,
      picking,
      consoleOpen,
      go: url => guard('Could not open the page', () => tab.load(url)),
      history: action => guard('Could not go there', () => tab.history(action)),
      screenshot,
      togglePick: () => (picking.get() ? leavePick() : picking.set(true)),
    }),
    screenView(
      kit,
      { tab, screen, visible, picking, driving: () => mode.get() === 'agent', pickAt },
      show(
        () => consoleOpen.get() && tab.open.get(),
        () => consoleDrawer(kit, tab, () => consoleOpen.set(false)),
      ),
    ),
    statusBar(kit, tab, mode, driver => guard('Could not switch control', () => tab.control(driver))),
  )
}
