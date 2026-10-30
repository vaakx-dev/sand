import { type DeviceRecord, devicesList, devicesRemove, devicesRename } from '@sand/devices-contract'
import type { Daemon } from '@sand/host-daemon/contract'

const findDevice = (devices: DeviceRecord[], value: string) => {
  const byId = devices.find(device => device.id === value)
  if (byId) return byId
  const wanted = value.toLowerCase()
  const named = devices.filter(device => device.name.toLowerCase() === wanted)
  if (named.length > 1) throw new Error(`several devices are called "${value}"; pass an id: ${named.map(device => device.id).join(', ')}`)
  if (!named[0]) throw new Error(`no device called "${value}"; known: ${devices.map(device => device.name).join(', ') || 'none'}`)
  return named[0]
}

const lookUp = async (daemon: Daemon, value: string) => findDevice(await daemon.request(devicesList, {}), value)

export const removeDevice = async (daemon: Daemon, value: string) => {
  const device = await lookUp(daemon, value)
  await daemon.request(devicesRemove, { device: device.id })
  console.log(`removed ${device.name}; it has to pair again to use sand`)
}

export const renameDevice = async (daemon: Daemon, value: string, name: string) => {
  const device = await lookUp(daemon, value)
  const renamed = await daemon.request(devicesRename, { device: device.id, name })
  console.log(`renamed ${device.name} to ${renamed.name}`)
}
