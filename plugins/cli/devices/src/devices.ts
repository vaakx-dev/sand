import type { Daemon } from '@sand/host-daemon/contract'
import { deviceInfo, devicesRemove } from '@sand/host-devices/contract'
import { findDevice, listDevices, printDevices } from './list'
import { network } from './network'
import { printLocalLink, printPairing } from './pair'

const usage = 'usage: sand devices [link | remove <name> | lan [on | off]]'
const actions = ['link', 'remove', 'lan']

const removeDevice = async (daemon: Daemon, value: string) => {
  const device = findDevice(await listDevices(daemon), value)
  await daemon.request(devicesRemove, { device: device.id })
  console.log(`removed ${device.name}; it has to pair again to use sand`)
}

export const devices = async (daemon: Daemon, [action, value]: string[]) => {
  if (action && !actions.includes(action)) throw new Error(usage)
  if (action === 'remove' && !value) throw new Error(usage)
  const info = await daemon.require()
  if (action === 'link') return printLocalLink(info)
  if (action === 'lan') return network(daemon, value)
  if (action === 'remove' && value) return removeDevice(daemon, value)
  const [self, paired] = await Promise.all([daemon.request(deviceInfo, {}), listDevices(daemon)])
  console.log(`this PC: ${self.name}  (${self.id})`)
  printDevices(paired)
  console.log('')
  await printPairing(info)
}
