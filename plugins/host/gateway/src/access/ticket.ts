import type { Auth, ThisPc, TicketGrant, TicketRefusal } from '@sand/devices-contract'
import { ticketProof, verify } from '@sand/devices-identity'
import { readJson, textReply } from '@sand/util/host'
import { z } from 'zod'
import type { Visitor } from '../http/peer'
import { json } from '../http/reply'
import type { Nonces, Tickets } from './keys'

const bodyLimit = 4096

const ticketBody = z.object({
  publicKey: z.string().min(1).max(256),
  nonce: z.string().min(1).max(256),
  signature: z.string().min(1).max(512),
})

const refuse = (refusal: TicketRefusal) => Response.json(refusal, { status: 401, headers: { 'cache-control': 'no-store' } })

interface TicketRouteOptions {
  thisPc: ThisPc
  auth: Pick<Auth, 'identify'>
  nonces: Nonces
  tickets: Tickets
}

export const createTicketRoute =
  ({ thisPc, auth, nonces, tickets }: TicketRouteOptions) =>
  async (request: Request, visitor: Visitor) => {
    const parsed = ticketBody.safeParse(await readJson(request, bodyLimit))
    if (!parsed.success) return textReply('expected {publicKey, nonce, signature} as JSON', 400)
    const { publicKey, nonce, signature } = parsed.data
    if (!nonces.take(nonce)) return refuse({ reason: 'nonce' })
    if (!verify(ticketProof(nonce, thisPc.id, publicKey), signature, publicKey)) return refuse({ reason: 'unknown' })
    const verdict = auth.identify(publicKey, visitor.source.local)
    if (!verdict.ok) return refuse(verdict.reason === 'removed' ? { reason: 'removed', at: verdict.at, by: verdict.by } : { reason: 'unknown' })
    const { secret, expires } = tickets.issue({ ...verdict.caller, name: verdict.name })
    const grant: TicketGrant = { ticket: secret, expires }
    return json(grant)
  }
