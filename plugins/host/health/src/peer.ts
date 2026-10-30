import { isPcUnavailable, type Peers } from '@sand/devices-contract'
import { errorMessage } from '@sand/util'
import { parseHealth } from '@sand/util/boot'
import { hostHealthRequest, type HostHealth } from './contract'

const timeout = 20_000

export const peerHealth = async (peers: Peers | undefined, device: string): Promise<HostHealth> => {
  const pc = peers?.get(device)
  if (!peers || !pc) throw new Error("That PC isn't one of your PCs")
  let answer: unknown
  try {
    answer = await peers.call(device, hostHealthRequest, {}, { timeout })
  } catch (error) {
    if (isPcUnavailable(error)) throw error
    throw new Error(`${pc.name} could not report its health: ${errorMessage(error)}`)
  }
  const health = parseHealth(answer)
  if (!health) throw new Error(`${pc.name} sent a health report this sand can't read`)
  return health
}
