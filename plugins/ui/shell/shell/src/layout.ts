import { derive, sig, stored, type Derive, type Sig } from '@vaakx-dev/vrui'
import { screenKey } from './address'
import type { Aside, AsideKind, Route, ShellState } from './contract'
import type { Built } from './screens'

interface LayoutParts {
  width: Sig<number>
  height: Sig<number>
  phone: Derive<boolean>
  current: Derive<Route>
  screen: () => Built | undefined
  shownAsides: Derive<Aside[]>
}

const DESK_WIDTH = 1000

const ROOMY_MAIN = 912

const SIDE_WIDTH = 288

const PANEL_WIDTH = 352

const CARD_HEIGHT = 360

const shellLayout = ({ width, height, phone, current, screen, shownAsides }: LayoutParts) => {
  const picked: Record<AsideKind, ReturnType<typeof stored<string | null>>> = {
    card: stored<string | null>('sand.shell.card', null),
    panel: stored<string | null>('sand.shell.panel', ''),
    drawer: stored<string | null>('sand.shell.drawer', ''),
  }
  const cardsOpen = stored<Record<string, boolean>>('sand.shell.card-open', {})
  const popsOpen = sig<Record<string, boolean>>({})
  const threadKey = derive(() => screenKey(current.get()))

  const openOf = (kind: AsideKind) =>
    derive(() => {
      if (phone.get()) return undefined
      const id = picked[kind].get()
      return shownAsides.get().find(spec => spec.kind === kind && (id === null || spec.id === id))
    })
  const cardSpec = openOf('card')
  const openPanel = openOf('panel')
  const openDrawer = openOf('drawer')

  const state = derive<ShellState>(() => {
    if (phone.get()) return 'phone'
    return width.get() < DESK_WIDTH && (openPanel.get() || screen()?.split) ? 'drawer' : 'wide'
  })

  const chatWidth = derive(() => width.get() - (state.get() === 'wide' ? SIDE_WIDTH : 0) - (openPanel.get() ? PANEL_WIDTH : 0))
  const floats = derive(() => chatWidth.get() >= ROOMY_MAIN && height.get() >= CARD_HEIGHT)
  const openCard = derive(() => (floats.get() && cardsOpen.get()[threadKey.get()] !== false ? cardSpec.get() : undefined))
  const openPop = derive(() => (!floats.get() && popsOpen.get()[threadKey.get()] ? cardSpec.get() : undefined))
  const setCardOpen = (show: boolean) => (floats.get() ? cardsOpen : popsOpen).update(all => ({ ...all, [threadKey.get()]: show }))

  const opened: Record<AsideKind, typeof openCard> = { card: openCard, panel: openPanel, drawer: openDrawer }
  const openFor = (spec: Aside) => (spec.kind === 'card' && !floats.get() ? openPop : opened[spec.kind])

  return {
    state,
    openCard,
    openPop,
    openPanel,
    openDrawer,
    roomy: derive(() => Boolean(openCard.get())),
    shownOnDesk: (spec: Aside) => openFor(spec).get()?.id === spec.id,
    showOnDesk(spec: Aside, show: boolean) {
      if (spec.kind === 'card') return setCardOpen(show)
      picked[spec.kind].set(show ? spec.id : '')
    },
  }
}

export { PANEL_WIDTH, SIDE_WIDTH, shellLayout }
