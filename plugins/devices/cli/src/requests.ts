import { type JoinRequest, pairApprove, pairDeny, pairRequests } from '@sand/devices-contract'
import type { Daemon } from '@sand/host-daemon/contract'
import { kindName } from './describe'

const describe = (request: JoinRequest) => `${request.name} (${kindName(request.kind)}, from ${request.address})`

const findRequest = (requests: JoinRequest[], code: string) => {
  const matching = requests.filter(request => request.code === code)
  if (matching.length > 1) throw new Error(`several devices show code ${code}: ${matching.map(describe).join(', ')}; answer them in the page`)
  const [found] = matching
  if (found) return found
  if (!requests.length) throw new Error('no device is waiting to join')
  throw new Error(`no device waiting to join shows code ${code}; waiting: ${requests.map(request => `${request.code} ${describe(request)}`).join(', ')}`)
}

export const answerRequest = async (daemon: Daemon, code: string, allow: boolean) => {
  const request = findRequest(await daemon.request(pairRequests, {}), code)
  const target = { id: request.id, pc: request.pc }
  if (!allow) {
    await daemon.request(pairDeny, target)
    return console.log(`turned ${describe(request)} away`)
  }
  const device = await daemon.request(pairApprove, target)
  console.log(`let ${device.name} in`)
}
