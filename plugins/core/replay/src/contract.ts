import { efforts } from '@sand/accounts/contract'
import { service } from 'drydock'
import { z } from 'zod'

const part = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), text: z.string() }),
  z.object({ type: z.literal('thinking'), text: z.string() }),
  z.object({ type: z.literal('call'), name: z.string(), id: z.string().optional(), input: z.record(z.string(), z.unknown()).default({}) }),
  z.object({ type: z.literal('usage'), input: z.number().default(0), output: z.number().default(0) }),
  z.object({ type: z.literal('error'), message: z.string() }),
  z.object({ type: z.literal('limit'), resetInMs: z.number().optional() }),
  z.object({ type: z.literal('hold') }),
  z.object({ type: z.literal('wait'), ms: z.number().nonnegative() }),
  z.object({ type: z.literal('crash') }),
  z.object({ type: z.literal('drop') }),
  z.object({ type: z.literal('status'), status: z.number(), error: z.string(), headers: z.record(z.string(), z.string()).default({}) }),
])

const model = z.union([
  z.string(),
  z.object({ name: z.string(), label: z.string().optional(), efforts: z.array(z.enum(efforts)).optional() }),
])

const window = z.object({ id: z.string(), label: z.string(), used: z.number(), resetInMs: z.number().optional(), durationMs: z.number().optional() })

export const sourceSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  logo: z.string().default('replay'),
  plan: z.string().optional(),
  limits: z.array(window).optional(),
  api: z.literal('anthropic').optional(),
  models: z.array(model).min(1),
  price: z.object({ input: z.number(), output: z.number(), cacheRead: z.number(), cacheWrite: z.number() }).optional(),
  replies: z.array(z.array(part)).default([]),
  resume: z.boolean().default(true),
  inject: z.array(z.enum(['ok', 'missing', 'error'])).default([]),
})

export type Part = z.infer<typeof part>

export type Reply = Part[]

export type LimitScript = z.infer<typeof window>

export type Source = z.input<typeof sourceSchema>

export type Script = z.output<typeof sourceSchema>

export type NativeCall =
  | { type: 'open'; cwd: string; resume?: string }
  | { type: 'inject'; text: string }
  | { type: 'send' | 'steer' | 'aside'; text: string }
  | { type: 'answer'; id: string; text: string }
  | { type: 'interrupt' | 'close' }

export interface ReplayRequests {
  bodies(source: string): string[]
  native(source: string): NativeCall[]
}

export const replayRequests = service<ReplayRequests>('replayRequests')
