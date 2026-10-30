import type { Peers } from '@sand/devices-contract'
import { sharePaths, type ShareInfo } from '../share/info'
import type { SharePc } from './pc'
import { Refused, refusal } from './refused'

const infoTimeout = 8_000

export const fetchInfo = async (peers: Peers, pc: SharePc, refresh: boolean): Promise<ShareInfo> => {
  const path = `${sharePaths.info}${refresh ? '?refresh=1' : ''}`
  const response = await peers.fetch(pc.id, path, undefined, { timeout: infoTimeout })
  if (response.status === 401 || response.status === 403 || response.status === 404) throw new Refused(response.status, await refusal(response))
  if (!response.ok) throw new Error(await refusal(response))
  return (await response.json()) as ShareInfo
}
