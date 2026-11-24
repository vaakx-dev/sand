import { backAddress } from '@sand/web-client/contract'
import { sig } from '@vaakx-dev/vrui'
import { ownEntry, recordPlace, requestedPlace, samePlace, type Place } from './address'
import type { Route } from './contract'

export const navigation = (known: (kind: string) => boolean, landing: () => Route) => {
  const fresh = !ownEntry()
  const place = sig<Place>(requestedPlace())
  if (fresh) recordPlace(place.get(), true)

  const go = (route: Route, replace: boolean) => {
    const now = place.get()
    const pushed = !replace || !ownEntry()
    const under = pushed ? now.route : now.under
    const next = { route: known(route.kind) ? route : landing(), depth: pushed ? now.depth + 1 : now.depth, ...(under && { under }) }
    recordPlace(next, replace)
    place.set(next)
  }

  const under = () => {
    const { depth, under: below } = place.get()
    return depth > 0 ? below : landing()
  }

  return {
    place,
    go,
    under,
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
