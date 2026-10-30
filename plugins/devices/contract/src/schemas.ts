import { z } from 'zod'

export const deviceKindSchema = z.enum(['pc', 'phone', 'browser'])

export const removalSchema = z.object({ at: z.number(), by: z.string() })

export const deviceRecordSchema = z.object({
  id: z.string().min(1),
  kind: deviceKindSchema,
  name: z.string(),
  platform: z.string().optional(),
  keys: z.array(z.object({ publicKey: z.string().min(1), added: z.number(), origin: z.string().optional() })),
  added: z.number(),
  addedBy: z.string(),
  updated: z.number(),
  removed: removalSchema.optional(),
})

export const joinRequestSchema = z.object({
  id: z.string().min(1),
  pc: z.string().min(1),
  pcName: z.string(),
  code: z.string(),
  name: z.string(),
  kind: deviceKindSchema,
  platform: z.string(),
  address: z.string(),
  created: z.number(),
  expires: z.number(),
})

export const joinOutcomeSchema = z.enum(['approved', 'denied', 'expired'])

export const pairSettledSchema = z.object({
  id: z.string().min(1),
  pc: z.string().min(1),
  outcome: joinOutcomeSchema,
  by: z.string().optional(),
  device: deviceRecordSchema.optional(),
})

export const routePrefsSchema = z.object({ order: z.array(z.string()), disabled: z.array(z.string()) })
