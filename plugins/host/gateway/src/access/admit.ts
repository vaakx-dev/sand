import type { Auth, ThisPc, TicketRefusal } from '@sand/devices-contract'
import { deviceIdOf, ticketProof, verify } from '@sand/devices-identity'
import { z } from 'zod'
import type { RouteCaller } from '../contract'
import type { Visitor } from '../http/peer'
import type { Nonces, Resumes } from './keys'

export const claimSchema = z.object({
  publicKey: z.string().min(1).max(256),
  nonce: z.string().min(1).max(256),
  signature: z.string().min(1).max(512),
})

export type Claim = z.infer<typeof claimSchema>

export type Admission = { ok: true; caller: RouteCaller } | { ok: false; refusal: TicketRefusal }

export interface AdmitOptions {
  thisPc: ThisPc
  auth: Pick<Auth, 'identify'>
  nonces: Nonces
  resumes: Resumes
}

const refused = (refusal: TicketRefusal): Admission => ({ ok: false, refusal })

const deviceOf = (publicKey: string) => {
  try {
    return deviceIdOf(publicKey)
  } catch {
    return undefined
  }
}

const fresh = ({ nonces, resumes }: AdmitOptions, device: string, nonce: string) => nonces.take(nonce) !== undefined || resumes.take(device, nonce)

export const createAdmit =
  (options: AdmitOptions) =>
  async ({ publicKey, nonce, signature }: Claim, visitor: Visitor): Promise<Admission> => {
    const device = deviceOf(publicKey)
    if (!device) return refused({ reason: 'unknown' })
    if (!fresh(options, device, nonce)) return refused({ reason: 'nonce' })
    if (!(await verify(ticketProof(nonce, options.thisPc.id, publicKey), signature, publicKey))) return refused({ reason: 'unknown' })
    const verdict = options.auth.identify(publicKey, visitor.source.local)
    if (!verdict.ok) return refused(verdict.reason === 'removed' ? { reason: 'removed', at: verdict.at, by: verdict.by } : { reason: 'unknown' })
    return { ok: true, caller: { ...verdict.caller, name: verdict.name } }
  }

export type Admit = ReturnType<typeof createAdmit>
