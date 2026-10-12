import type { Daemon, DeviceInfo } from '@sand/protocol'
import { findDevice, listDevices, printDevices } from './list'
import { network } from './network'
import { printPairing } from './pair'

const usage = 'usage: sand devices [remove <name> | lan [on | off]]'

const removeDevice = async (daemon: Daemon, value: string) => {
  const device = findDevice(await listDevices(daemon), value)
  await daemon.request({ type: 'devices.remove', device: device.id })
  console.log(`removed ${device.name}; it has to pair again to use sand`)
}

export const devices = async (daemon: Daemon, [action, value]: string[]) => {
  if (action && action !== 'remove' && action !== 'lan') throw new Error(usage)
  if (action === 'remove' && !value) throw new Error(usage)
  const info = await daemon.require()
  if (action === 'lan') return network(daemon, value)
  if (action === 'remove' && value) return removeDevice(daemon, value)
  const [self, paired] = await Promise.all([daemon.request<DeviceInfo>({ type: 'device.info' }), listDevices(daemon)])
  console.log(`this PC: ${self.name}  (${self.id})`)
  printDevices(paired)
  console.log('')
  await printPairing(info)
}
