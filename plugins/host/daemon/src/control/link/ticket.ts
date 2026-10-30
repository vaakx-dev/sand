import { devicePaths, type TicketBody, type TicketGrant } from '@sand/devices-contract'
import { sign, ticketProof } from '@sand/devices-identity'
import type { PcKeys } from '@sand/devices-identity/pc'
import { isRecord, trimSlash } from '@sand/util'

const ticketTimeout = 5000
const refusedKey = "sand refused this PC's key"

const refusals = new Map<string, string>([
  ['removed', 'sand refused this PC: it was removed from your PCs'],
  ['unknown', refusedKey],
  ['nonce', 'sand refused the sign-in it had just offered; try again'],
])

const isGrant = (value: unknown): value is TicketGrant => isRecord(value) && typeof value.ticket === 'string' && typeof value.expires === 'number'

const refusalOf = (value: unknown) => (isRecord(value) && typeof value.reason === 'string' && refusals.get(value.reason)) || refusedKey

export const requestTicket = async (url: string, keys: PcKeys, nonce: string) => {
  const body: TicketBody = { publicKey: keys.publicKey, nonce, signature: sign(ticketProof(nonce, keys.id, keys.publicKey), keys.secretKey) }
  const response = await fetch(`${trimSlash(url)}${devicePaths.ticket}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(ticketTimeout),
  })
  const reply: unknown = await response.json().catch(() => undefined)
  if (response.status === 401) throw new Error(refusalOf(reply))
  if (!response.ok || !isGrant(reply)) throw new Error(`sand gave this PC no ticket (HTTP ${response.status})`)
  return reply.ticket
}
