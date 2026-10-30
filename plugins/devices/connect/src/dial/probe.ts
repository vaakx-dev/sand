import { type AttemptResult, deviceParams, devicePaths, type PcIdentity, type Route, type Transport } from '@sand/devices-contract'
import { newNonce } from '@sand/devices-identity'
import { errorMessage } from '@sand/util'
import { probeTimeout } from '../timing'
import { attemptResultOf } from './classify'
import { type ExpectedPc, identityOf, isIdentityReply, provesPc } from './proof'

export interface PassedProbe {
  route: Route
  ok: true
  identity: PcIdentity
  nonce: string
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

export const probeRoute = async (route: Route, transportOf: (route: Route) => Transport, expected: ExpectedPc): Promise<Probe> => {
  const started = Date.now()
  const failed = (result: AttemptResult, error: string): FailedProbe => ({ route, ok: false, result, error, ms: Date.now() - started })
  try {
    const transport = transportOf(route)
    const clientNonce = newNonce()
    const response = await transport.fetch(identityPath(clientNonce), { timeout: probeTimeout(route) })
    if (!response.ok) return failed('error', `${devicePaths.identity} answered ${response.status}`)
    const reply: unknown = await response.json()
    if (!isIdentityReply(reply)) return failed('error', `${devicePaths.identity} didn't answer with a PC identity`)
    if (reply.id !== expected.id) return failed('wrong-pc', `reached ${reply.name}, a different PC`)
    if (!provesPc(reply, expected, clientNonce)) return failed('wrong-pc', `${reply.name} couldn't prove it holds the paired key`)
    return { route, ok: true, identity: identityOf(reply), nonce: reply.nonce, ms: Date.now() - started }
  } catch (error) {
    return failed(attemptResultOf(error), errorMessage(error))
  }
}
