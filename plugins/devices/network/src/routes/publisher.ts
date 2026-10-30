import type { PublishedRoute } from '@sand/devices-contract'

export const createRoutePublisher = (compute: () => PublishedRoute[], changed: (routes: PublishedRoute[]) => void) => {
  let routes = compute()
  let published = JSON.stringify(routes)

  const check = () => {
    const next = compute()
    const json = JSON.stringify(next)
    if (json === published) return false
    routes = next
    published = json
    changed(next)
    return true
  }

  return { current: () => routes, check }
}
