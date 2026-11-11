import type { Kit } from '@sand/ui-kit/contract'
import { addressLayer, addressSettled, leaveLayer, pushLayer } from '@sand/web-client/contract'
import { derive, effect, sig, stored, untrack } from '@vaakx-dev/vrui'
import { sameScreen, screenKey } from './address'
import { homeRoute, type Aside, type AsideKind, type ChipSource, type NavItem, type Place, type Route, type RouteSpec, type SheetSpec, type ShellSection, type ShellState, type SubjectSource } from './contract'
import { navigation } from './navigation'
import { registry } from './registry'
import { screenCache } from './screens'

export interface Placed {
  view: HTMLElement
  order: number
}

export type StackDrag = number | 'back' | undefined

export const phoneWidth = 600

export const deskWidth = 1000

export const drawerReach = 288

export const roomyMain = 912

export const sideWidth = 288

export const panelWidth = 352

export const asideKind = 'aside'

const layers = { drawer: 'drawer', sheet: 'sheet', cover: 'cover' } as const

const home: Route = { kind: homeRoute }

export const shellModel = (kit: Kit) => {
  const navs = registry<NavItem>()
  const sections = registry<ShellSection>()
  const routes = registry<RouteSpec>()
  const chips = registry<ChipSource>()
  const asides = registry<Aside>()
  const subjects = sig<SubjectSource[]>([])
  const places: Record<Place, ReturnType<typeof registry<Placed>>> = { overlay: registry(), top: registry(), home: registry() }

  const width = sig(window.innerWidth)
  const layer = sig(addressLayer())
  const sheet = sig<SheetSpec | undefined>(undefined)
  const openFolds = stored<string[]>('sand.shell.open-groups', [])
  const picked: Record<AsideKind, ReturnType<typeof stored<string | null>>> = {
    card: stored<string | null>('sand.shell.card', null),
    panel: stored<string | null>('sand.shell.panel', ''),
    drawer: stored<string | null>('sand.shell.drawer', ''),
  }
  const drawerDrag = sig<number | undefined>(undefined)
  const stackDrag = sig<StackDrag>(undefined)
  const leaving = sig<Route[]>([])

  const specFor = (kind: string) => routes.items.get().find(spec => spec.kind === kind)
  const known = (kind: string) => (kind === asideKind ? phone.get() : Boolean(specFor(kind)))
  const phone = derive(() => width.get() < phoneWidth)
  const nav = navigation(kind => untrack(() => known(kind)), () => untrack(() => phone.get()))

  const current = derive(() => {
    const { route } = nav.place.get()
    return known(route.kind) ? route : home
  })
  const before = sig<Route>(home)
  let last = home
  effect(() => {
    const now = current.get()
    if (now.kind !== last.kind) untrack(() => before.set(last))
    last = now
  })
  const pushed = derive(() => (current.get().kind === homeRoute ? [] : nav.place.get().stack.filter(route => known(route.kind))))

  const beside = derive(() => (current.get().kind === asideKind ? (pushed.get().at(-2) ?? home) : current.get()))
  const shownAsides = derive(() => asides.items.get().filter(spec => spec.shows(beside.get())))
  const openOf = (kind: AsideKind) =>
    derive(() => {
      if (phone.get()) return undefined
      const id = picked[kind].get()
      return shownAsides.get().find(spec => spec.kind === kind && (id === null || spec.id === id))
    })
  const openCard = openOf('card')
  const openPanel = openOf('panel')
  const openDrawer = openOf('drawer')
  const pushedAside = derive(() => (current.get().kind === asideKind ? asides.items.get().find(spec => spec.id === current.get().id) : undefined))

  const routeOf = (key: string) => (phone.get() ? pushed.get() : [current.get()]).find(route => screenKey(route) === key)
  const screens = screenCache(specFor, routeOf, text => kit.barTitle(text))
  const screen = derive(() => screens.get(current.get()))
  const alive = derive(() => new Set((phone.get() ? [...pushed.get(), ...leaving.get()] : [current.get()]).map(screenKey)))

  const state = derive<ShellState>(() => {
    const size = width.get()
    if (size < phoneWidth) return 'phone'
    const built = screen.get()
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

  const drawerOpen = derive(() => state.get() === 'drawer' && layer.get() === layers.drawer)
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

  const roomy = derive(() => {
    if (state.get() !== 'wide' || !openCard.get()) return false
    return width.get() - sideWidth - (openPanel.get() ? panelWidth : 0) >= roomyMain
  })

  const asideSheets = new Map<string, SheetSpec>()
  const asideSheet = (spec: Aside) => {
    const found = asideSheets.get(spec.id)
    if (found) return found
    const made: SheetSpec = { label: spec.label, look: 'list', head: () => null, body: () => spec.render(() => beside.get()) }
    asideSheets.set(spec.id, made)
    return made
  }
  const opened: Record<AsideKind, typeof openCard> = { card: openCard, panel: openPanel, drawer: openDrawer }

  const asideShown = (spec: Aside) => {
    if (!phone.get()) return opened[spec.kind].get()?.id === spec.id
    if (spec.kind !== 'card') return pushedAside.get()?.id === spec.id
    const shown = sheetShown.get()
    return shown !== undefined && shown === asideSheets.get(spec.id)
  }

  const showAside = (id: string, show: boolean) => {
    const spec = asides.items.get().find(found => found.id === id)
    if (!spec) return
    if (!phone.get()) return picked[spec.kind].set(show ? id : '')
    if (spec.kind !== 'card') {
      if (show) open({ kind: asideKind, id })
      else if (pushedAside.get()?.id === id) nav.back()
      return
    }
    if (show) showSheet(asideSheet(spec))
    else if (sheetShown.get() === asideSheets.get(id)) leave()
  }

  const subjectOf = (route: Route) => subjects.get().reduce<ReturnType<SubjectSource>>((found, source) => found ?? source(route), undefined)

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
    pushed,
    screen,
    screens,
    alive,
    leaving,
    stackDrag,
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
    openPanel,
    openDrawer,
    pushedAside,
    beside,
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
    leaveNav: () => open(before.get()),
    back: nav.back,
    follow() {
      layer.set(addressLayer())
      if (!layer.get()) sheet.set(undefined)
      followCover()
      stackDrag.set(undefined)
      nav.follow()
    },
  }
}

export type Model = ReturnType<typeof shellModel>
