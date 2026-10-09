import type { HostDevices, PairInvite } from '@sand/host-devices/contract'
import { pairLink } from '@sand/kit'

export const createInviter =
  (devices: Pick<HostDevices, 'invite'>, urls: () => string[]) =>
  (): PairInvite => {
    const { secret, expires } = devices.invite()
    return { secret, expires, links: urls().map(url => pairLink(url, secret)) }
  }
