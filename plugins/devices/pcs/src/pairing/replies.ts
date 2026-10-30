import { type DeviceRecord, deviceRecordSchema, type JoinTicket } from '@sand/devices-contract'
import { isRecord } from '@sand/util'

export const deviceOf = (body: unknown): DeviceRecord | undefined => {
  if (!isRecord(body)) return undefined
  const parsed = deviceRecordSchema.safeParse(body.device)
  return parsed.success ? parsed.data : undefined
}

export const reasonOf = <R extends string>(body: unknown, reasons: readonly R[]): R | undefined =>
  isRecord(body) && reasons.includes(body.reason as R) ? (body.reason as R) : undefined

export const isJoinTicket = (body: unknown): body is JoinTicket =>
  isRecord(body) && typeof body.id === 'string' && typeof body.code === 'string' && typeof body.expires === 'number' && Array.isArray(body.approve)

export const phaseOf = (body: unknown) => (isRecord(body) && typeof body.phase === 'string' ? body.phase : undefined)
