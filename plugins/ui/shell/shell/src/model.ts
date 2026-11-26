import type { Kit } from '@sand/ui-kit/contract'
import { derive, sig, stored } from '@vaakx-dev/vrui'
import type { Aside, ChipSource, NavItem, Place, Route, RouteSpec, ShellSection } from './contract'
import { routeHistory } from './history'
import { layerStack } from './layer'
import { shellLayout } from './layout'
import { registry } from './registry'
import { shellSlides } from './slides'

interface Placed {
  view: HTMLElement
  order: number
}

const PHONE_WIDTH = 600

const shellModel = (kit: Kit) => {
  const navs = registry<NavItem>()
  const sections = registry<ShellSection>()
  const routes = registry<RouteSpec>()
  const chips = registry<ChipSource>()
  const asides = registry<Aside>()
  const places: Record<Place, ReturnType<typeof registry<Placed>>> = { overlay: registry(), top: registry() }
  const openFolds = stored<string[]>('sand.shell.open-groups', [])

  const width = sig(window.innerWidth)
  const height = sig(window.innerHeight)
  const phone = derive(() => width.get() < PHONE_WIDTH)

  const layers = layerStack()
  const history = routeHistory({ kit, routes, phone, layers })
  const asidesOf = (route: Route) => asides.items.get().filter(spec => spec.shows(route))
  const shownAsides = derive(() => asidesOf(history.current.get()))
  const layout = shellLayout({ width, height, phone, current: history.current, screen: history.screen, shownAsides })
  const slides = shellSlides({ layers, width, phone, state: layout.state, shownAsides })

  const asideShown = (spec: Aside) => (phone.get() ? slides.coverId.get() === spec.id : layout.shownOnDesk(spec))
  const showAside = (id: string, show: boolean) => {
    const spec = asides.items.get().find(found => found.id === id)
    if (!spec) return
    if (phone.get()) return slides.showCover(id, show)
    layout.showOnDesk(spec, show)
  }

  return {
    kit,
    navs,
    sections,
    routes,
    chips,
    asides,
    places,
    width,
    height,
    phone,
    ...history,
    ...layout,
    ...slides,
    sheetsShown: layers.sheetsShown,
    showSheet: layers.showSheet,
    closeSheet: layers.closeSheet,
    dismissSheet: layers.dismissSheet,
    shownAsides,
    asidesOf,
    asideShown,
    showAside,
    foldOpen: (key: string) => openFolds.get().includes(key),
    toggleFold: (key: string) => openFolds.update(keys => (keys.includes(key) ? keys.filter(other => other !== key) : [...keys, key])),
  }
}

type Model = ReturnType<typeof shellModel>

export { shellModel, type Model, type Placed }
