import { backAddress, forwardAddress } from '@sand/web-client/contract'
import { sig } from '@vaakx-dev/vrui'
import { ownEntry, recordPlace, requestedPlace, sameScreen, samePlace, type Place } from './address'
import { homeRoute, type Route } from './contract'

const home: Route = { kind: homeRoute }

export const navigation = (known: (kind: string) => boolean, stacking: () => boolean) => {
  const place = sig<Place>(requestedPlace())
  const ahead = sig(0)
  if (!ownEntry()) recordPlace(place.get(), true)

  const stackAfter = (stack: Route[], route: Route) => {
    if (route.kind === homeRoute) return []
    if (!stacking()) return [route]
    const at = stack.findIndex(other => sameScreen(other, route))
    return [...(at < 0 ? stack : stack.slice(0, at)), route]
  }

  const go = (route: Route, replace: boolean) => {
    const now = place.get()
    const target = known(route.kind) ? route : home
    const pushed = !replace || !ownEntry()
    const next = { route: target, stack: stackAfter(now.stack, target), depth: pushed ? now.depth + 1 : now.depth }
    recordPlace(next, replace)
    if (pushed) ahead.set(0)
    place.set(next)
  }

  return {
    place,
    ahead,
    go,
    back() {
      const { stack, depth } = place.get()
      if (depth > 0) backAddress()
      else go(stack.at(-2) ?? home, true)
    },
    forward: forwardAddress,
    follow() {
      const next = requestedPlace()
      const now = place.get()
      if (samePlace(next, now)) return
      ahead.update(count => Math.max(count + now.depth - next.depth, 0))
      place.set(next)
    },
  }
}
