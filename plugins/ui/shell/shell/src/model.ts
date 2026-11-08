import type { Kit } from '@sand/ui-kit/contract'
import { addressLayer, leaveLayer, pushLayer } from '@sand/web-client/contract'
import { derive, effect, sig, stored, untrack } from '@vaakx-dev/vrui'
import { sameScreen, screenKey } from './address'
import { homeRoute, type ChipSource, type NavItem, type Place, type Route, type RouteSpec, type SheetSpec, type ShellSection, type ShellState } from './contract'
import { navigation } from './navigation'
import { registry } from './registry'
import { screenCache } from './screens'

export interface Placed {
  view: HTMLElement
  order: number
}

export type Drag = number | 'back' | undefined

export const phoneWidth = 600

export const deskWidth = 1000

export const drawerReach = 288

const layers = { drawer: 'drawer', sheet: 'sheet', cover: 'cover' } as const

const home: Route = { kind: homeRoute }

export const shellModel = (kit: Kit) => {
  const navs = registry<NavItem>()
  const sections = registry<ShellSection>()
  const routes = registry<RouteSpec>()
  const chips = registry<ChipSource>()
  const places: Record<Place, ReturnType<typeof registry<Placed>>> = { overlay: registry(), top: registry(), home: registry() }

  const width = sig(window.innerWidth)
  const layer = sig(addressLayer())
  const sheet = sig<SheetSpec | undefined>(undefined)
  const hiddenSides = stored<string[]>('sand.shell.hidden-sides', [])
  const drawerDrag = sig<number | undefined>(undefined)
  const backDrag = sig<Drag>(undefined)
  const leaving = sig<Route[]>([])

  const specFor = (kind: string) => routes.items.get().find(spec => spec.kind === kind)
  const known = (kind: string) => Boolean(specFor(kind))
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

  const routeOf = (key: string) => (phone.get() ? pushed.get() : [current.get()]).find(route => screenKey(route) === key)
  const screens = screenCache(specFor, routeOf, text => kit.barTitle(text))
  const screen = derive(() => screens.get(current.get()))
  const alive = derive(() => new Set((phone.get() ? [...pushed.get(), ...leaving.get()] : [current.get()]).map(screenKey)))

  const state = derive<ShellState>(() => {
    const size = width.get()
    if (size < phoneWidth) return 'phone'
    const built = screen.get()
    return size < deskWidth && (built?.side || built?.split) ? 'drawer' : 'wide'
  })

  const sideHidden = (kind: string) => hiddenSides.get().includes(kind)
  const showSide = (kind: string, shown: boolean) => hiddenSides.update(kinds => [...kinds.filter(other => other !== kind), ...(shown ? [] : [kind])])

  let uncover: (() => void) | undefined
  const followCover = () => {
    const close = uncover
    if (!close || layer.get() === layers.cover) return
    uncover = undefined
    close()
  }

  const enter = (name: string) => {
    pushLayer(name)
    layer.set(addressLayer())
    followCover()
  }

  const leave = () => {
    sheet.set(undefined)
    leaveLayer()
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

  return {
    kit,
    navs,
    sections,
    routes,
    chips,
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
    backDrag,
    drawerDrag,
    drawerOpen,
    setDrawer,
    sheetShown,
    showSheet,
    cover,
    closeSheet: (spec: SheetSpec) => {
      if (sheet.get() === spec) leave()
    },
    sideHidden,
    showSide,
    isCurrent: (to: Route) => (to.id === undefined ? to.kind === current.get().kind : sameScreen(to, current.get())) && (to.tab === undefined || to.tab === current.get().tab),
    open,
    leaveNav: () => open(before.get()),
    back: nav.back,
    follow() {
      layer.set(addressLayer())
      if (!layer.get()) sheet.set(undefined)
      followCover()
      backDrag.set(undefined)
      nav.follow()
    },
  }
}

export type Model = ReturnType<typeof shellModel>
