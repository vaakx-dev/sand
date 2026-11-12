import { backAddress } from '@sand/web-client/contract'
import { sig } from '@vaakx-dev/vrui'
import { ownEntry, recordPlace, requestedPlace, samePlace, type Place } from './address'
import { homeRoute, type Route } from './contract'

const home: Route = { kind: homeRoute }

export const navigation = (known: (kind: string) => boolean, landing: () => Route) => {
  const fresh = !ownEntry()
  const place = sig<Place>(requestedPlace(fresh ? landing() : home))
  if (fresh) recordPlace(place.get(), true)

  const go = (route: Route, replace: boolean) => {
    const { depth } = place.get()
    const pushed = !replace || !ownEntry()
    const next = { route: known(route.kind) ? route : home, depth: pushed ? depth + 1 : depth }
    recordPlace(next, replace)
    place.set(next)
  }

  return {
    place,
    go,
    back() {
      if (place.get().depth > 0) backAddress()
      else go(landing(), true)
    },
    follow() {
      const next = requestedPlace()
      if (samePlace(next, place.get())) return
      place.set(next)
    },
  }
}
