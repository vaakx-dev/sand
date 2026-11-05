import { z } from 'zod'

const part = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), text: z.string() }),
  z.object({ type: z.literal('thinking'), text: z.string() }),
  z.object({ type: z.literal('call'), name: z.string(), input: z.record(z.string(), z.unknown()).default({}) }),
  z.object({ type: z.literal('usage'), input: z.number().default(0), output: z.number().default(0) }),
  z.object({ type: z.literal('error'), message: z.string() }),
  z.object({ type: z.literal('hold') }),
])

export const sourceSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  models: z.array(z.string()).min(1),
  replies: z.array(z.array(part)).default([]),
})

export type Part = z.infer<typeof part>

export type Reply = Part[]

export type Source = z.input<typeof sourceSchema>
