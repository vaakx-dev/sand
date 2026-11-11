import { deviceParams, type IdentityReply, type ThisPc } from '@sand/devices-contract'
import { textReply } from '@sand/util/host'
import type { RouteCaller } from '../contract'
import type { Peer, Visitor } from '../http/peer'
import { unauthorized } from '../http/reply'
import type { SocketData } from '../listen'
import { type Admit, type Claim, claimSchema } from './admit'
import { identityReply, tooLong } from './identity'
import type { Tickets } from './keys'
import type { Sessions } from './sessions'

interface SocketRouteOptions {
  thisPc: ThisPc
  admit: Admit
  tickets: Pick<Tickets, 'take'>
  sessions: Pick<Sessions, 'create'>
}

const upgraded = (peer: Peer, data: SocketData) => (peer.upgrade(data) ? undefined : textReply('expected a websocket', 400))

const claimOf = (params: URLSearchParams): Claim | undefined =>
  claimSchema.safeParse({ publicKey: params.get(deviceParams.key), nonce: params.get(deviceParams.nonce), signature: params.get(deviceParams.signature) }).data

export const createSocketRoute = ({ thisPc, admit, tickets, sessions }: SocketRouteOptions) => {
  const open = (peer: Peer, caller: RouteCaller, proof?: IdentityReply) =>
    upgraded(peer, { ok: true, caller: { device: caller.device, kind: caller.kind }, session: sessions.create(caller), ...(proof && { proof }) })

  const signed = async (claim: Claim, challenge: string | null, peer: Visitor) => {
    if (challenge && tooLong(challenge)) return textReply(`expected a shorter ?${deviceParams.challenge}=`, 400)
    const admission = await admit(claim, peer)
    if (!admission.ok) return upgraded(peer, { ok: false, refusal: admission.refusal })
    return open(peer, admission.caller, challenge ? await identityReply(thisPc, challenge, claim.nonce) : undefined)
  }

  return (request: Request, peer: Visitor) => {
    const params = new URL(request.url).searchParams
    const ticket = params.get(deviceParams.ticket)
    const ticketed = ticket ? tickets.take(ticket) : undefined
    if (ticketed) return open(peer, ticketed)
    const claim = claimOf(params)
    return claim ? signed(claim, params.get(deviceParams.challenge), peer) : unauthorized()
  }
}
