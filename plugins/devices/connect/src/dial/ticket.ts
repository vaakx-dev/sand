import { devicePaths, type TicketBody } from '@sand/devices-contract'
import { ticketProof } from '@sand/devices-identity'
import { lazy } from '@sand/util'
import { z } from 'zod'
import { AccessRefused, isRefusal } from '../errors/access-refused'
import { probeTimeout } from '../timing'
import type { DialContext } from './context'
import type { PassedProbe } from './probe'

const grantSchema = lazy(() => z.object({ ticket: z.string(), expires: z.number() }))

const bodyOf = (response: Response): Promise<unknown> => response.json().catch(() => undefined)

export const requestTicket = async ({ route, identity, nonce }: PassedProbe, { signer, transportOf }: DialContext, signal: AbortSignal) => {
  const body: TicketBody = { publicKey: signer.publicKey, nonce, signature: await signer.sign(ticketProof(nonce, identity.id, signer.publicKey)) }
  const response = await transportOf(route).fetch(devicePaths.ticket, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    timeout: probeTimeout(route),
    signal,
  })
  const reply = await bodyOf(response)
  if (response.status === 401 && isRefusal(reply)) throw new AccessRefused(reply)
  if (!response.ok) throw new Error(`${devicePaths.ticket} answered ${response.status}`)
  const grant = grantSchema().safeParse(reply)
  if (!grant.success) throw new Error(`${devicePaths.ticket} didn't answer with a ticket`)
  return grant.data
}
