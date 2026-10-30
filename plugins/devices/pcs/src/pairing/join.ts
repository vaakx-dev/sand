import { type DeviceRecord, devicePaths, type JoinBody, type JoinRefusalReason, type JoinTicket, joinRequestPath } from '@sand/devices-contract'
import { getJson, postJson } from './http'
import { deviceOf, isJoinTicket, phaseOf, reasonOf } from './replies'
import { describeThisDevice } from './this-device'

const refusals: JoinRefusalReason[] = ['not-private', 'rate-limited', 'already-paired']

export type JoinAsked = { ok: true; ticket: JoinTicket } | { ok: false; reason: JoinRefusalReason }

export type JoinCheck = { phase: 'pending' } | { phase: 'approved'; device: DeviceRecord } | { phase: 'denied' } | { phase: 'expired' }

export const askToJoin = async (publicKey: string): Promise<JoinAsked> => {
  const body: JoinBody = { publicKey, ...describeThisDevice() }
  const reply = await postJson(devicePaths.joinRequest, body)
  if (reply.ok && isJoinTicket(reply.body)) return { ok: true, ticket: reply.body }
  const reason = reasonOf(reply.body, refusals)
  if (reason) return { ok: false, reason }
  throw new Error(`Couldn't ask to join: ${devicePaths.joinRequest} answered ${reply.status}`)
}

export const checkJoin = async (id: string): Promise<JoinCheck> => {
  const reply = await getJson(joinRequestPath(id))
  if (reply.status === 404) return { phase: 'expired' }
  const phase = phaseOf(reply.body)
  const device = phase === 'approved' ? deviceOf(reply.body) : undefined
  if (device) return { phase: 'approved', device }
  if (phase === 'denied' || phase === 'expired') return { phase }
  if (phase === 'pending') return { phase }
  throw new Error(`Couldn't check the join request: ${joinRequestPath(id)} answered ${reply.status}`)
}
