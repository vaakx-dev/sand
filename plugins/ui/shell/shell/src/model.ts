import type { Kit } from '@sand/ui-kit/contract'
import { addressLayer, addressSettled, leaveLayer, pushLayer } from '@sand/web-client/contract'
import { derive, effect, sig, stored, untrack } from '@vaakx-dev/vrui'
import { nowhere, sameScreen, screenKey } from './address'
import { type Aside, type AsideKind, type ChipSource, type NavItem, type Place, type Route, type RouteSpec, type SheetSpec, type ShellSection, type ShellState, type SubjectSource } from './contract'
import { navigation } from './navigation'
import { registry } from './registry'
import { screenCache } from './screens'

export interface Placed {
  view: HTMLElement
  order: number
}

export type Axis = 'x' | 'y'

export interface Pull {
  id: string
  px: number
  held: boolean
}

export const phoneWidth = 600

export const deskWidth = 1000

export const roomyMain = 912

export const sideWidth = 288

export const panelWidth = 352

export const cardHeight = 360

const layers = { drawer: 'drawer', sheet: 'sheet', cover: 'cover', aside: 'aside:' } as const

export const shellModel = (kit: Kit) => {
  const navs = registry<NavItem>()
  const sections = registry<ShellSection>()
  const routes = registry<RouteSpec>()
  const chips = registry<ChipSource>()
  const asides = registry<Aside>()
  const subjects = sig<SubjectSource[]>([])
  const places: Record<Place, ReturnType<typeof registry<Placed>>> = { overlay: registry(), top: registry() }

  const width = sig(window.innerWidth)
  const height = sig(window.innerHeight)
  const layer = sig(addressLayer())
  const sheet = sig<SheetSpec | undefined>(undefined)
  const openFolds = stored<string[]>('sand.shell.open-groups', [])
  const picked: Record<AsideKind, ReturnType<typeof stored<string | null>>> = {
    card: stored<string | null>('sand.shell.card', null),
    panel: stored<string | null>('sand.shell.panel', ''),
    drawer: stored<string | null>('sand.shell.drawer', ''),
  }
  const drawerDrag = sig<number | undefined>(undefined)
  const pull = sig<Pull | undefined>(undefined)
  const lastChat = stored<Route | null>('sand.shell.last-chat', null)

  const specFor = (kind: string) => routes.items.get().find(spec => spec.kind === kind)
  const known = (kind: string) => Boolean(specFor(kind))
  const phone = derive(() => width.get() < phoneWidth)
  const landing = derive((): Route => {
    const last = lastChat.get()
    if (last && known(last.kind)) return last
    const spec = routes.items.get().find(found => found.lands)
    return spec ? { kind: spec.kind } : nowhere
  })
  const nav = navigation(kind => untrack(() => known(kind)), () => untrack(() => landing.get()))

  const current = derive(() => {
    const { route } = nav.place.get()
    return known(route.kind) ? route : landing.get()
  })
  const before = sig<Route>(nowhere)
  let last = nowhere
  effect(() => {
    const now = current.get()
    if (now.kind !== last.kind) untrack(() => before.set(last))
    last = now
  })

  const shownAsides = derive(() => asides.items.get().filter(spec => spec.shows(current.get())))
  const openOf = (kind: AsideKind) =>
    derive(() => {
      if (phone.get()) return undefined
      const id = picked[kind].get()
      return shownAsides.get().find(spec => spec.kind === kind && (id === null || spec.id === id))
    })
  const threadKey = derive(() => screenKey(current.get()))
  const cardsOpen = stored<Record<string, boolean>>('sand.shell.card-open', {})
  const popsOpen = sig<Record<string, boolean>>({})
  const cardSpec = openOf('card')
  const openPanel = openOf('panel')
  const openDrawer = openOf('drawer')

  const routeOf = (key: string) => (screenKey(current.get()) === key ? current.get() : undefined)
  const screens = screenCache(specFor, routeOf, text => kit.barTitle(text))
  const screen = () => screens.get(current.get())
  const alive = derive(() => new Set([screenKey(current.get())]))

  const state = derive<ShellState>(() => {
    const size = width.get()
    if (size < phoneWidth) return 'phone'
    const built = screen()
    return size < deskWidth && (openPanel.get() || built?.split) ? 'drawer' : 'wide'
  })

  let uncover: (() => void) | undefined
  const followCover = () => {
    const close = uncover
    if (!close || layer.get() === layers.cover) return
    uncover = undefined
    close()
  }

  const enter = (name: string) => {
    pushLayer(name)
    layer.set(addressSettled() ? addressLayer() : undefined)
    followCover()
  }

  const leave = () => {
    sheet.set(undefined)
    leaveLayer()
    layer.set(undefined)
  }

  const drawerReach = derive(() => (phone.get() ? width.get() : sideWidth))
  const drawerOpen = derive(() => state.get() !== 'wide' && layer.get() === layers.drawer)
  const setDrawer = (open: boolean) => {
    if (open === drawerOpen.get()) return
    if (open) enter(layers.drawer)
    else leave()
  }

  const showSheet = (spec: SheetSpec) => {
    if (layer.get() !== layers.sheet) enter(layers.sheet)
    sheet.set(spec)
  }
  const sheetShown = derive(() => (layer.get() === layers.sheet ? sheet.get() : undefined))

  const open = (route: Route, replace = false) => {
    if (layer.get()) leave()
    nav.go(route, replace)
  }

  const cover = (close: () => void) => {
    enter(layers.cover)
    uncover = close
    return () => {
      if (uncover !== close) return
      uncover = undefined
      if (layer.get() === layers.cover) leave()
    }
  }

  const chatWidth = derive(() => width.get() - (state.get() === 'wide' ? sideWidth : 0) - (openPanel.get() ? panelWidth : 0))
  const floats = derive(() => chatWidth.get() >= roomyMain && height.get() >= cardHeight)
  const openCard = derive(() => (floats.get() && cardsOpen.get()[threadKey.get()] !== false ? cardSpec.get() : undefined))
  const openPop = derive(() => (!floats.get() && popsOpen.get()[threadKey.get()] ? cardSpec.get() : undefined))
  const setCardOpen = (show: boolean) => (floats.get() ? cardsOpen : popsOpen).update(all => ({ ...all, [threadKey.get()]: show }))
  const roomy = derive(() => Boolean(openCard.get()))

  const opened: Record<AsideKind, typeof openCard> = { card: openCard, panel: openPanel, drawer: openDrawer }

  const coverId = derive(() => {
    const name = layer.get()
    return phone.get() && name?.startsWith(layers.aside) ? name.slice(layers.aside.length) : undefined
  })
  const coverAside = derive(() => shownAsides.get().find(spec => spec.id === coverId.get()))
  const covered = derive(() => drawerOpen.get() || Boolean(coverAside.get()))

  const asideShown = (spec: Aside) => {
    if (phone.get()) return coverId.get() === spec.id
    return (spec.kind === 'card' && !floats.get() ? openPop : opened[spec.kind]).get()?.id === spec.id
  }

  const showCover = (id: string, show: boolean) => {
    if (show) return enter(`${layers.aside}${id}`)
    if (coverId.get() === id) leave()
  }

  const showAside = (id: string, show: boolean) => {
    const spec = asides.items.get().find(found => found.id === id)
    if (!spec) return
    if (phone.get()) return showCover(id, show)
    if (spec.kind === 'card') return setCardOpen(show)
    picked[spec.kind].set(show ? id : '')
  }

  const axisOf = (spec: Aside): Axis => (spec.kind === 'drawer' ? 'y' : 'x')
  const rightAsides = derive(() => shownAsides.get().filter(spec => axisOf(spec) === 'x'))
  const nextRight = () => {
    const top = coverAside.get()
    if (!top) return rightAsides.get()[0]
    const shown = rightAsides.get()
    const at = shown.indexOf(top)
    return at < 0 ? undefined : shown[at + 1]
  }
  const bottomAside = () => (coverAside.get() ? undefined : shownAsides.get().find(spec => axisOf(spec) === 'y'))

  const subjectOf = (route: Route) => subjects.get().reduce<ReturnType<SubjectSource>>((found, source) => found ?? source(route), undefined)
  effect(() => {
    const route = current.get()
    if (subjectOf(route)) untrack(() => lastChat.set(route))
  })

  return {
    kit,
    navs,
    sections,
    routes,
    chips,
    asides,
    places,
    width,
    phone,
    state,
    current,
    screen,
    screens,
    alive,
    pull,
    axisOf,
    nextRight,
    bottomAside,
    coverAside,
    covered,
    drawerReach,
    drawerDrag,
    drawerOpen,
    setDrawer,
    sheetShown,
    showSheet,
    cover,
    closeSheet: (spec: SheetSpec) => {
      if (sheet.get() === spec) leave()
    },
    shownAsides,
    openCard,
    openPop,
    height,
    openPanel,
    openDrawer,
    asideShown,
    showAside,
    roomy,
    subjectOf,
    addSubject(source: SubjectSource) {
      subjects.update(all => [...all, source])
      return () => subjects.update(all => all.filter(other => other !== source))
    },
    foldOpen: (key: string) => openFolds.get().includes(key),
    toggleFold: (key: string) => openFolds.update(keys => (keys.includes(key) ? keys.filter(other => other !== key) : [...keys, key])),
    isCurrent: (to: Route) => (to.id === undefined ? to.kind === current.get().kind : sameScreen(to, current.get())) && (to.tab === undefined || to.tab === current.get().tab),
    open,
    land(forget?: Route) {
      const last = lastChat.get()
      if (forget && last && sameScreen(forget, last)) lastChat.set(null)
      open(landing.get(), true)
    },
    leaveNav: () => open(before.get()),
    back: nav.back,
    follow() {
      layer.set(addressLayer())
      if (!layer.get()) sheet.set(undefined)
      followCover()
      nav.follow()
    },
  }
}

export type Model = ReturnType<typeof shellModel>
