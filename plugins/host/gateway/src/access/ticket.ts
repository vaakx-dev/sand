import type { TicketGrant, TicketRefusal } from '@sand/devices-contract'
import { readJson, textReply } from '@sand/util/host'
import type { Visitor } from '../http/peer'
import { json } from '../http/reply'
import { type Admit, claimSchema } from './admit'
import type { Tickets } from './keys'

const bodyLimit = 4096

const refuse = (refusal: TicketRefusal) => Response.json(refusal, { status: 401, headers: { 'cache-control': 'no-store' } })

export const createTicketRoute = (admit: Admit, tickets: Tickets) => async (request: Request, visitor: Visitor) => {
  const parsed = claimSchema.safeParse(await readJson(request, bodyLimit))
  if (!parsed.success) return textReply('expected {publicKey, nonce, signature} as JSON', 400)
  const admission = await admit(parsed.data, visitor)
  if (!admission.ok) return refuse(admission.refusal)
  const { secret, expires } = tickets.issue(admission.caller)
  const grant: TicketGrant = { ticket: secret, expires }
  return json(grant)
}
