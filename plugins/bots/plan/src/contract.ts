import { request, type, wireEvent } from '@sand/host-hub/contract'
import { z } from 'zod'

export const planLimit = 20_000

const one = z.object({ bot: z.string().optional() })

export const planChangeWire = wireEvent<[bot: string, text: string]>('botPlan.change')

export const planRead = request('botPlan.read', { input: one, output: type<string>(), callers: 'any' })
export const planWrite = request('botPlan.write', { input: one.extend({ text: z.string().max(planLimit) }), output: type<void>(), callers: 'any' })
