import type { Peers } from '@sand/devices-contract'
import type { LLMRequest } from '../contract'
import { sharePaths } from '../share/info'
import type { Carried } from '../share/media'
import type { SharePc } from './pc'
import { Refused, refusal } from './refused'

const answerTimeout = 10_000
const streamTimeout = 60 * 60_000

export type SharedRequest = LLMRequest & { media: Carried }

export const openStream = async (peers: Peers, pc: SharePc, request: SharedRequest, signal?: AbortSignal) => {
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal?.addEventListener('abort', abort, { once: true })
  const timer = setTimeout(abort, answerTimeout)
  try {
    const init = { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request), signal: controller.signal }
    const response = await peers.fetch(pc.id, sharePaths.stream, init, { timeout: streamTimeout })
    if (!response.ok || !response.body) throw new Refused(response.status, await refusal(response))
    return response.body
  } finally {
    clearTimeout(timer)
  }
}
