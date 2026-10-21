import type { Daemon } from '@sand/host-daemon/contract'
import { devicesList, type PairedDevice } from '@sand/host-devices/contract'
import type { DeviceKind } from '@sand/host-gateway/contract'
import { ago } from '@sand/util'

const kinds: Record<DeviceKind, string> = { pc: 'PC', phone: 'phone', browser: 'browser' }

const seen = (at: number) => {
  const elapsed = ago(at)
  if (!elapsed) return 'never seen'
  return elapsed === 'now' ? 'seen just now' : `last seen ${elapsed} ago`
}

const describe = (device: PairedDevice) => `  ${device.name}  (${kinds[device.kind] ?? device.kind}, ${seen(device.lastSeen)})`

export const listDevices = (daemon: Daemon) => daemon.request(devicesList, {})

export const printDevices = (devices: PairedDevice[]) =>
  console.log(devices.length ? ['paired devices:', ...devices.map(describe)].join('\n') : 'no paired devices yet')

export const findDevice = (devices: PairedDevice[], value: string) => {
  const byId = devices.find(device => device.id === value)
  if (byId) return byId
  const wanted = value.toLowerCase()
  const named = devices.filter(device => device.name.toLowerCase() === wanted)
  if (named.length > 1) throw new Error(`several devices are called "${value}"; pass an id: ${named.map(device => device.id).join(', ')}`)
  if (!named[0]) throw new Error(`no device called "${value}"; known: ${devices.map(device => device.name).join(', ') || 'none'}`)
  return named[0]
}
