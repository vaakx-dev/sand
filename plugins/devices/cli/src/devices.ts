import type { Daemon } from '@sand/host-daemon/contract'
import { addDevice } from './add'
import { joinPc } from './join'
import { listDevices } from './list'
import { network } from './network'
import { removeDevice, renameDevice } from './records'
import { answerRequest } from './requests'

export const devicesUsage = [
  'sand devices                          list your PCs, phones and browsers, and devices waiting to join',
  'sand devices add                      show a QR code and link that pair a phone or browser',
  'sand devices approve <code>           let a device waiting to join in (its code shows on its screen)',
  'sand devices deny <code>              turn a device waiting to join away',
  'sand devices join <link | address>    add this PC to the PCs of another sand; without one, lists the PCs found nearby',
  'sand devices remove <name | id>       remove a device; it has to pair again to use sand',
  'sand devices rename <name | id> <new> rename a device or this PC',
  'sand devices network [on | off]       show or change whether sand listens on your home network and Tailscale',
].join('\n')

const usageError = () => new Error(`usage:\n${devicesUsage}`)

const required = (value: string | undefined) => {
  if (!value) throw usageError()
  return value
}

export const devices = async (daemon: Daemon, [action, ...rest]: string[]) => {
  if (!action) return listDevices(daemon)
  if (action === 'add') return addDevice(daemon)
  if (action === 'approve' || action === 'deny') return answerRequest(daemon, required(rest[0]), action === 'approve')
  if (action === 'join') return joinPc(daemon, rest[0])
  if (action === 'remove') return removeDevice(daemon, required(rest[0]))
  if (action === 'rename') return renameDevice(daemon, required(rest[0]), required(rest.slice(1).join(' ').trim()))
  if (action === 'network') return network(daemon, rest[0])
  throw usageError()
}
