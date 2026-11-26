import { Slide, type Kit } from '@sand/ui-kit/contract'
import { derive, effect, sig, stored, untrack, type Derive } from '@vaakx-dev/vrui'
import { nowhere, sameScreen, screenKey } from './address'
import type { Route, RouteSpec, SubjectSource } from './contract'
import type { Layers } from './layer'
import { navigation } from './navigation'
import type { Registry } from './registry'
import { screenCache, type Built } from './screens'

interface Frame {
  route: Route
  built: Built | undefined
}

interface HistoryParts {
  kit: Kit
  routes: Registry<RouteSpec>
  phone: Derive<boolean>
  layers: Layers
}

const routeHistory = ({ kit, routes, phone, layers }: HistoryParts) => {
  const subjects = sig<SubjectSource[]>([])
  const lastChat = stored<Route | null>('sand.shell.last-chat', null)

  const specFor = (kind: string) => routes.items.get().find(spec => spec.kind === kind)
  const known = (kind: string) => Boolean(specFor(kind))
  const landing = derive((): Route => {
    const last = lastChat.get()
    if (last && known(last.kind)) return last
    const spec = routes.items.get().find(found => found.lands)
    return spec ? { kind: spec.kind } : nowhere
  })
  const nav = navigation(kind => untrack(() => known(kind)), () => untrack(() => landing.get()))

  const shown = (route: Route) => (known(route.kind) ? route : landing.get())
  const current = derive(() => shown(nav.place.get().route))
  const before = sig<Route>(nowhere)
  let last = nowhere
  effect(() => {
    const now = current.get()
    if (now.kind !== last.kind) untrack(() => before.set(last))
    last = now
  })

  const routeOf = (key: string) => (screenKey(current.get()) === key ? current.get() : undefined)
  const screens = screenCache(specFor, routeOf, text => kit.barTitle(text))
  const screen = () => screens.get(current.get())

  const open = (route: Route, replace = false) => {
    layers.leaveAny()
    nav.go(route, replace)
  }

  const historyBack = (built: Built | undefined) => Boolean(built?.nav) && phone.get()
  const goBack = (route: Route) => {
    const below = nav.under()
    if (below && sameScreen(route, below)) nav.back()
    else open(route, true)
  }
  const backOf = (built: Built | undefined) => {
    const route = built?.back?.()
    if (route) return () => goBack(route)
    return historyBack(built) ? nav.back : undefined
  }
  const underOf = (built: Built | undefined) => {
    const route = built?.back?.() ?? (historyBack(built) ? nav.under() : undefined)
    return route && shown(route)
  }

  const under = derive(() => {
    const route = phone.get() ? underOf(screen()) : undefined
    return route && !sameScreen(route, current.get()) ? route : undefined
  })
  const frames = derive((): Frame[] => [under.get(), current.get()].flatMap(route => (route ? [{ route, built: screens.get(route) }] : [])))

  const leaving = new Slide(0, at => {
    if (at < 1) return
    const back = backOf(screen())
    if (back) back()
    else leaving.place(0)
  })
  effect(() => {
    current.get()
    untrack(() => leaving.place(0))
  })

  const subjectOf = (route: Route) => subjects.get().reduce<ReturnType<SubjectSource>>((found, source) => found ?? source(route), undefined)
  effect(() => {
    const route = current.get()
    if (subjectOf(route)) untrack(() => lastChat.set(route))
  })

  return {
    current,
    screen,
    screens,
    frames,
    alive: derive(() => new Set(frames.get().map(({ route }) => screenKey(route)))),
    leaving,
    settleBack: (back: boolean) => leaving.aim(back ? 1 : 0),
    backOf,
    subjectOf,
    addSubject(source: SubjectSource) {
      subjects.update(all => [...all, source])
      return () => subjects.update(all => all.filter(other => other !== source))
    },
    isCurrent: (to: Route) => (to.id === undefined ? to.kind === current.get().kind : sameScreen(to, current.get())) && (to.tab === undefined || to.tab === current.get().tab),
    open,
    land(forget?: Route) {
      const remembered = lastChat.get()
      if (forget && remembered && sameScreen(forget, remembered)) lastChat.set(null)
      open(landing.get(), true)
    },
    leaveNav: () => open(before.get()),
    back: nav.back,
    follow() {
      layers.follow()
      nav.follow()
    },
  }
}

export { routeHistory, type Frame }
