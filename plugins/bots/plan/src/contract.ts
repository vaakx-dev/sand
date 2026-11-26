import { request, type, wireEvent } from '@sand/host-hub/contract'
import { z } from 'zod'

export const planLimit = 20_000

const one = z.object({ bot: z.string().optional() })

export const planReplacement = z.object({
  old_string: z.string().min(1).describe('Exact text in the plan to replace, matching once'),
  new_string: z.string().describe('Replacement text; empty removes it'),
})

export type PlanReplacement = z.infer<typeof planReplacement>

const whole = one.extend({ text: z.string() }).strict()

const targeted = one.extend({ edits: z.array(planReplacement).min(1) }).strict()

export type PlanChange = z.infer<typeof whole> | z.infer<typeof targeted>

export const planChangeWire = wireEvent<[bot: string, text: string]>('botPlan.change')

export const planRead = request('botPlan.read', { input: () => one, output: type<string>(), callers: 'any' })
export const planEdit = request('botPlan.edit', { input: () => z.union([whole, targeted]), output: type<void>(), callers: 'any' })
