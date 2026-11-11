import { lazy } from '@sand/util'
import { z } from 'zod'

export const joinKindSchema = lazy(() => z.enum(['pc', 'phone', 'browser']))

export const deviceKindSchema = lazy(() => z.enum([...joinKindSchema().options, 'agent']))

export const agentAccessSchema = lazy(() => z.enum(['read', 'operate']))

export type AgentAccess = z.infer<ReturnType<typeof agentAccessSchema>>

export const pcIconSchema = lazy(() => z.enum(['desktop', 'laptop', 'tower', 'mini', 'server', 'cloud', 'board', 'linux']))

export type PcIcon = z.infer<ReturnType<typeof pcIconSchema>>

export const removalSchema = lazy(() => z.object({ at: z.number(), by: z.string() }))

export const pushTargetSchema = lazy(() => z.object({
  endpoint: z.url({ protocol: /^https?$/ }),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
}))

export const devicePushSchema = lazy(() => pushTargetSchema().extend({ pc: z.string().min(1) }))

export const deviceRecordSchema = lazy(() => z.object({
  id: z.string().min(1),
  kind: deviceKindSchema(),
  name: z.string(),
  platform: z.string().optional(),
  icon: pcIconSchema().optional(),
  detectedIcon: pcIconSchema().optional(),
  keys: z.array(z.object({ publicKey: z.string().min(1), added: z.number(), origin: z.string().optional() })),
  push: devicePushSchema().optional(),
  added: z.number(),
  addedBy: z.string(),
  updated: z.number(),
  removed: removalSchema().optional(),
  agent: z.object({ access: agentAccessSchema(), token: z.string().min(1) }).optional(),
}))

export const joinRequestSchema = lazy(() => z.object({
  id: z.string().min(1),
  pc: z.string().min(1),
  pcName: z.string(),
  code: z.string(),
  name: z.string(),
  kind: joinKindSchema(),
  platform: z.string(),
  address: z.string(),
  created: z.number(),
  expires: z.number(),
}))

export const joinOutcomeSchema = lazy(() => z.enum(['approved', 'denied', 'expired']))

export const pairSettledSchema = lazy(() => z.object({
  id: z.string().min(1),
  pc: z.string().min(1),
  outcome: joinOutcomeSchema(),
  by: z.string().optional(),
  device: deviceRecordSchema().optional(),
}))

export const routePrefsSchema = lazy(() => z.object({ order: z.array(z.string()), disabled: z.array(z.string()) }))
