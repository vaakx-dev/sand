import type { PeerView } from '@sand/devices-contract'
import type { HelloField } from '@sand/host-hub/contract'
import type { PeerLink } from './link'

export const viewOf = (link: PeerLink): PeerView => {
  const identity = link.connection.identity()
  const platform = identity?.platform ?? link.record.platform
  return {
    id: link.record.id,
    name: identity?.name ?? link.record.name,
    ...(platform && { platform }),
    ...(identity?.build && { build: identity.build }),
    ...link.connection.diagnosis(),
  }
}

export const helloOf = <T>(link: PeerLink | undefined, field: HelloField<T>) => {
  const reply = link?.hello()
  return (reply?.fresh[field.id] ?? reply?.shared?.[field.id]) as T | undefined
}

export const directUrlOf = (link: PeerLink | undefined) => {
  const status = link?.connection.status()
  return status?.phase === 'connected' ? status.route.url : undefined
}
