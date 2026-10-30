import { type DeviceRecord, devicePaths, type PairBody, type PairRefusalReason } from '@sand/devices-contract'
import { postJson } from './http'
import { deviceOf, reasonOf } from './replies'
import { describeThisDevice } from './this-device'

const refusals: PairRefusalReason[] = ['invalid', 'wrong-kind', 'removed']

export type Redeemed = { ok: true; device: DeviceRecord } | { ok: false; reason: PairRefusalReason }

export const redeemToken = async (token: string, publicKey: string): Promise<Redeemed> => {
  const body: PairBody = { token, publicKey, ...describeThisDevice() }
  const reply = await postJson(devicePaths.pair, body)
  const device = reply.ok ? deviceOf(reply.body) : undefined
  if (device) return { ok: true, device }
  const reason = reasonOf(reply.body, refusals)
  if (reason) return { ok: false, reason }
  throw new Error(`Pairing failed: ${devicePaths.pair} answered ${reply.status}`)
}
