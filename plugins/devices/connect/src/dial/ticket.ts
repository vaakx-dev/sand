import { devicePaths, type Signer, type TicketBody, type TicketGrant, type TicketRefusal, type Transport } from '@sand/devices-contract'
import { ticketProof } from '@sand/devices-identity'
import { isRecord } from '@sand/util'
import { TicketRefused } from '../errors/ticket-refused'

const refusalReasons = ['removed', 'unknown', 'nonce']

const isGrant = (value: unknown): value is TicketGrant =>
  isRecord(value) && typeof value.ticket === 'string' && typeof value.expires === 'number'

const isRefusal = (value: unknown): value is TicketRefusal =>
  isRecord(value) && typeof value.reason === 'string' && refusalReasons.includes(value.reason)

const bodyOf = (response: Response): Promise<unknown> => response.json().catch(() => undefined)

export const requestTicket = async (transport: Transport, signer: Signer, pc: string, nonce: string, timeout: number) => {
  const body: TicketBody = { publicKey: signer.publicKey, nonce, signature: signer.sign(ticketProof(nonce, pc, signer.publicKey)) }
  const response = await transport.fetch(devicePaths.ticket, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    timeout,
  })
  const reply = await bodyOf(response)
  if (response.status === 401 && isRefusal(reply)) throw new TicketRefused(reply)
  if (!response.ok) throw new Error(`${devicePaths.ticket} answered ${response.status}`)
  if (!isGrant(reply)) throw new Error(`${devicePaths.ticket} didn't answer with a ticket`)
  return reply
}
