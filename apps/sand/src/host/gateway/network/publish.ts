import type { HostRoute } from '@sand/protocol'

export const createRoutePublisher = (routes: () => HostRoute[], broadcast: (routes: HostRoute[]) => void) => {
  let published = JSON.stringify(routes())
  return (force: boolean) => {
    const next = routes()
    const json = JSON.stringify(next)
    if (!force && json === published) return
    published = json
    broadcast(next)
  }
}
