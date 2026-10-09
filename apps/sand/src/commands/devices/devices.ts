import { ask } from '../../daemon/ask'
import { requireRunning } from '../../daemon/info'
import { findDevice, listDevices, printDevices } from './list'
import { network } from './network'
import { printPairing } from './pair'

const usage = 'usage: sand devices [remove <name> | lan [on | off]]'

export const devices = async (home: string, [action, value]: string[]) => {
  if (action && action !== 'remove' && action !== 'lan') throw new Error(usage)
  if (action === 'remove' && !value) throw new Error(usage)
  const info = await requireRunning(home)
  if (action === 'lan') return network(info, value)
  const listed = await listDevices(info)
  if (action === 'remove') {
    const device = findDevice(listed, value!)
    await ask(info, { type: 'devices.remove', device: device.id })
    return console.log(`removed ${device.name}; it has to pair again to use sand`)
  }
  printDevices(listed)
  console.log('')
  await printPairing(info)
}
