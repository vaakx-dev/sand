import { request, type, wireEvent } from '@sand/host-hub/contract'
import { z } from 'zod'
import type { DeviceRecord } from '../records'
import type { PairLink } from './links'
import type { JoinRequest, OutgoingJoin, PairJoined, PairJoinResult, PairSettled } from './types'

const target = { id: z.string().min(1), pc: z.string().min(1).optional() }

export const pairLink = request('pair.link', { input: z.object({ kind: z.enum(['device', 'pc']) }), output: type<PairLink>() })
export const pairCancel = request('pair.cancel', { input: z.object({ token: z.string().min(1) }), output: type<void>() })
export const pairHandoff = request('pair.handoff', { input: z.object({}), output: type<PairLink>() })

export const pairRequests = request('pair.requests', { input: z.object({}), output: type<JoinRequest[]>() })
export const pairApprove = request('pair.approve', { input: z.object(target), output: type<DeviceRecord>() })
export const pairDeny = request('pair.deny', { input: z.object(target), output: type<void>() })

export const pairJoin = request('pair.join', {
  input: z.object({ url: z.string().min(1), pc: z.string().min(1).optional() }),
  output: type<OutgoingJoin>(),
})
export const pairJoins = request('pair.joins', { input: z.object({}), output: type<OutgoingJoin[]>() })
export const pairCancelJoin = request('pair.cancelJoin', { input: z.object({ id: z.string().min(1) }), output: type<void>() })

export const pairJoined = wireEvent<PairJoined>('pair.joined')
export const pairRequested = wireEvent<JoinRequest>('pair.requested')
export const pairSettled = wireEvent<PairSettled>('pair.settled')
export const pairJoinResult = wireEvent<PairJoinResult>('pair.joinResult')
