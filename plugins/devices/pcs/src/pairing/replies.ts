import { type DeviceRecord, deviceRecordSchema, type JoinTicket } from '@sand/devices-contract'
import { lazy } from '@sand/util'
import { z } from 'zod'

const deviceReplySchema = lazy(() => z.object({ device: deviceRecordSchema() }))

const reasonReplySchema = lazy(() => z.object({ reason: z.string() }))

const phaseReplySchema = lazy(() => z.object({ phase: z.string() }))

const joinTicketSchema = lazy(() => z.object({ id: z.string(), code: z.string(), expires: z.number(), approve: z.array(z.unknown()) }))

export const deviceOf = (body: unknown): DeviceRecord | undefined => deviceReplySchema().safeParse(body).data?.device

export const reasonOf = <R extends string>(body: unknown, reasons: readonly R[]): R | undefined => {
  const reason = reasonReplySchema().safeParse(body).data?.reason
  return reasons.find(found => found === reason)
}

export const isJoinTicket = (body: unknown): body is JoinTicket => joinTicketSchema().safeParse(body).success

export const phaseOf = (body: unknown) => phaseReplySchema().safeParse(body).data?.phase
