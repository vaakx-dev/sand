import type { PcView, Route } from '@sand/devices-contract'
import type { KnownPc } from './known'
import type { PcLink } from './link'

const addressOf = (route: Route) => {
  if (!route.url) return undefined
  try {
    return new URL(route.url).host
  } catch {
    return undefined
  }
}

export const fallbackName = (home: boolean) => (home ? location.hostname : 'Unknown PC')

export const viewOf = (link: PcLink, home: boolean, known: KnownPc | undefined): PcView => {
  const status = link.connection.status()
  const identity = link.connection.identity()
  const platform = known?.platform ?? identity?.platform
  const address = status.phase === 'connected' ? addressOf(status.route) : undefined
  const build = identity?.build
  return {
    id: link.pc,
    name: known?.name ?? identity?.name ?? fallbackName(home),
    home,
    online: status.phase === 'connected',
    status,
    ...(platform && { platform }),
    ...(address && { address }),
    ...(build && { build }),
    ...(known?.seen && { seen: known.seen }),
  }
}
