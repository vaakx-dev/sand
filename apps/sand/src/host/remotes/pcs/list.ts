import type { DeviceInfo, PairedDevice, PcInfo, PcList, RemoteRecord } from '@sand/protocol'
import type { Status } from '../link/status'

const latest = (...times: (number | undefined)[]) => {
  const known = times.filter((time): time is number => typeof time === 'number')
  return known.length ? Math.max(...known) : undefined
}

const pcInfo = (id: string, remote: RemoteRecord | undefined, device: PairedDevice | undefined, status: Status): PcInfo => {
  const state = status.get(id)
  const lastSeen = latest(device?.lastSeen, state?.lastSeen)
  const url = state?.url ?? remote?.url
  const pairing = state?.refused ? 'refused' : remote && device ? 'paired' : 'incomplete'
  return {
    id,
    name: remote?.name ?? device?.name ?? id,
    ...(remote?.platform && { platform: remote.platform }),
    pairing,
    online: state?.online ?? false,
    checked: state?.checked ?? false,
    ...(lastSeen && { lastSeen }),
    ...(device && { added: device.added }),
    ...(url && { url }),
    ...(state?.error && { error: state.error }),
  }
}

export const pcList = (self: DeviceInfo, remotes: RemoteRecord[], devices: PairedDevice[], status: Status): PcList => {
  const pcs = devices.filter(device => device.kind === 'pc')
  const ids = [...new Set([...remotes.map(remote => remote.id), ...pcs.map(device => device.id)])]
  const list = ids.map(id =>
    pcInfo(
      id,
      remotes.find(remote => remote.id === id),
      pcs.find(device => device.id === id),
      status,
    ),
  )
  return {
    self,
    pcs: list.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)),
    devices: devices.filter(device => device.kind !== 'pc'),
  }
}
