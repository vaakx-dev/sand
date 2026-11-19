import type { Peers } from '@sand/devices-contract'
import type { LLMRequest } from '../contract'
import { sharePaths } from '../share/info'
import type { Carried } from '../share/media'
import { SILENCE_MS } from './lines'
import type { SharePc } from './pc'
import { Refused, refusal } from './refused'

export type SharedRequest = LLMRequest & { media: Carried }

export const openStream = async (peers: Peers, pc: SharePc, request: SharedRequest, signal?: AbortSignal) => {
  const init = { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request), signal }
  const response = await peers.fetch(pc.id, sharePaths.stream, init, { timeout: SILENCE_MS })
  if (!response.ok || !response.body) throw new Refused(response.status, await refusal(response))
  return response.body
}
