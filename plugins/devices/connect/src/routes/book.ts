import type { PublishedRoute, Route, RouteEntry, RoutePrefs, RouteStore } from '@sand/devices-contract'
import { mergeRoutes, sameRoutes } from './merge'
import { orderRoutes } from './order'
import { directRoute, publishedRoutes } from './route'

export interface RouteBook {
  entries(secure: boolean): RouteEntry[]
  publish(published: PublishedRoute[]): boolean
  add(url: string): Route
  remove(key: string): boolean
  setPrefs(prefs: RoutePrefs): void
}

const noPrefs: RoutePrefs = { order: [], disabled: [] }

export const routeBook = (pc: string, seeds: Route[], store: RouteStore): RouteBook => {
  const saved = store.load(pc)
  let routes = mergeRoutes(seeds, saved?.routes.filter(route => route.source !== 'seed') ?? [])
  let prefs = saved?.prefs ?? noPrefs

  const save = () => store.save(pc, { routes, prefs })

  const replace = (next: Route[]) => {
    if (sameRoutes(routes, next)) return false
    routes = next
    save()
    return true
  }

  return {
    entries: secure => orderRoutes(routes, prefs, secure),
    publish: published =>
      replace(
        mergeRoutes(
          seeds,
          publishedRoutes(published),
          routes.filter(route => route.source === 'added'),
        ),
      ),
    add(url) {
      const route = directRoute(url, 'added')
      if (!route) throw new Error(`${url} isn't an http or https address`)
      replace(mergeRoutes(routes, [route]))
      return route
    },
    remove: key => replace(routes.filter(route => route.key !== key)),
    setPrefs(next) {
      prefs = { order: [...next.order], disabled: [...next.disabled] }
      save()
    },
  }
}
