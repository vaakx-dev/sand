import { type AttemptResult, deviceParams, devicePaths, type IdentityReply, type PcIdentity, type Route, type Signer } from '@sand/devices-contract'
import { isIdentityReply, newNonce } from '@sand/devices-identity'
import { errorMessage } from '@sand/util'
import { probeTimeout } from '../timing'
import { attemptResultOf } from './classify'
import type { DialContext } from './context'
import { identityOf, provesPc } from './proof'
import { type Claim, signClaim } from './socket'

export interface PassedProbe {
  route: Route
  ok: true
  identity: PcIdentity
  nonce: string
  claim?: Promise<Claim>
  ms: number
}

export interface FailedProbe {
  route: Route
  ok: false
  result: AttemptResult
  error: string
  ms: number
}

export type Probe = PassedProbe | FailedProbe

const identityPath = (nonce: string) => `${devicePaths.identity}?${deviceParams.nonce}=${encodeURIComponent(nonce)}`

const claimFor = (reply: IdentityReply, signer: Signer) => {
  if (!reply.signedSocket) return undefined
  const claim = signClaim(signer, reply.id, reply.nonce)
  claim.catch(() => {})
  return claim
}

export const probeRoute = async (route: Route, context: DialContext, signal: AbortSignal): Promise<Probe> => {
  const started = Date.now()
  const expected = context.expected()
  const failed = (result: AttemptResult, error: string): FailedProbe => ({ route, ok: false, result, error, ms: Date.now() - started })
  try {
    const transport = context.transportOf(route)
    const clientNonce = newNonce()
    const response = await transport.fetch(identityPath(clientNonce), { timeout: probeTimeout(route), signal })
    if (!response.ok) return failed('error', `${devicePaths.identity} answered ${response.status}`)
    const reply: unknown = await response.json()
    if (!isIdentityReply(reply)) return failed('error', `${devicePaths.identity} didn't answer with a PC identity`)
    if (reply.id !== expected.id) return failed('wrong-pc', `reached ${reply.name}, a different PC`)
    const claim = claimFor(reply, context.signer)
    if (!(await provesPc(reply, expected, clientNonce))) return failed('wrong-pc', `${reply.name} couldn't prove it holds the paired key`)
    return { route, ok: true, identity: identityOf(reply), nonce: reply.nonce, ...(claim && { claim }), ms: Date.now() - started }
  } catch (error) {
    return failed(attemptResultOf(error), errorMessage(error))
  }
}
