import type { Pcs } from '@sand/devices-contract'
import type { Fleet } from './fleet/fleet'
import type { Pairing } from './pairing/pairing'

export const createPcs = (fleet: Fleet, pairing: Pairing): Pcs => {
  const get = (id: string) => fleet.view(id)
  return {
    self: pairing.self,
    here: () => fleet.view(fleet.home)!,
    list: fleet.views,
    get,
    name: fleet.nameOf,
    online: id => get(id)?.online ?? false,
    diagnosis: id => fleet.link(id)?.connection.diagnosis(),
    retry: fleet.retry,
    setRoutePrefs: (id, prefs) => fleet.link(id)?.connection.setPrefs(prefs),
    addRoute: (id, url) => fleet.connection(id).addRoute(url),
    removeRoute: (id, key) => fleet.link(id)?.connection.removeRoute(key),
    pairing: pairing.state,
    requestJoin: pairing.requestJoin,
    approval: pairing.approval,
    dismissApproval: pairing.dismissApproval,
  }
}
