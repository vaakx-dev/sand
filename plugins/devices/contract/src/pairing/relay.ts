import { request, type } from '@sand/host-hub/contract'
import { z } from 'zod'
import { joinRequestSchema, pairSettledSchema } from '../schemas'
import type { PairSettled } from './types'

export const pairRelay = request('pair.relay', {
  input: z.object({ requests: z.array(joinRequestSchema), settled: z.array(pairSettledSchema) }),
  output: type<void>(),
  callers: 'pc',
})

export const pairDecide = request('pair.decide', {
  input: z.object({ id: z.string().min(1), outcome: z.enum(['approved', 'denied']), by: z.string().min(1) }),
  output: type<PairSettled>(),
  callers: 'pc',
})
