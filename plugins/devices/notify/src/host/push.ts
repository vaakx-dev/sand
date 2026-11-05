import type { PushTarget } from '@sand/devices-contract'
import type { Notice } from '../contract'
import { encryptPush } from './encrypt'
import type { Vapid } from './vapid'

export type PushOutcome = 'sent' | 'gone'

const expired = new Set([404, 410])
const dayInSeconds = String(24 * 60 * 60)
const waitMs = 15_000

const sender = async () => ({
  keys: await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']),
  salt: crypto.getRandomValues(new Uint8Array(16)),
})

export const sendPush = async (vapid: Vapid, target: PushTarget, notice: Notice): Promise<PushOutcome> => {
  const body = await encryptPush(new TextEncoder().encode(JSON.stringify(notice)), target.keys, await sender())
  const response = await fetch(target.endpoint, {
    method: 'POST',
    headers: {
      authorization: await vapid.authorization(target.endpoint),
      'content-encoding': 'aes128gcm',
      'content-type': 'application/octet-stream',
      ttl: dayInSeconds,
      urgency: 'high',
    },
    body,
    signal: AbortSignal.timeout(waitMs),
  })
  if (response.ok) return 'sent'
  if (expired.has(response.status)) return 'gone'
  throw new Error(`${new URL(target.endpoint).host} refused a push with ${response.status}: ${await response.text()}`)
}
