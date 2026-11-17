import { devicePaths, type TicketBody } from '@sand/devices-contract'
import { sign, ticketProof } from '@sand/devices-identity'
import type { PcKeys } from '@sand/devices-identity/pc'
import { trimSlash } from '@sand/util'
import { z } from 'zod'

const ticketTimeout = 5000
const refusedKey = "sand refused this PC's key"

const refusals = new Map<string, string>([
  ['removed', 'sand refused this PC: it was removed from your PCs'],
  ['unknown', refusedKey],
  ['nonce', 'sand refused the sign-in it had just offered; try again'],
])

const grant = z.object({ ticket: z.string(), expires: z.number() })

const refusal = z.object({ reason: z.string() })

const refusalOf = (value: unknown) => refusals.get(refusal.safeParse(value).data?.reason ?? '') ?? refusedKey

export const requestTicket = async (url: string, keys: PcKeys, nonce: string) => {
  const body: TicketBody = { publicKey: keys.publicKey, nonce, signature: await sign(ticketProof(nonce, keys.id, keys.publicKey), keys.secretKey) }
  const response = await fetch(`${trimSlash(url)}${devicePaths.ticket}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(ticketTimeout),
  })
  const reply: unknown = await response.json().catch(() => undefined)
  if (response.status === 401) throw new Error(refusalOf(reply))
  const granted = grant.safeParse(reply)
  if (!response.ok || !granted.success) throw new Error(`sand gave this PC no ticket (HTTP ${response.status})`)
  return granted.data.ticket
}
