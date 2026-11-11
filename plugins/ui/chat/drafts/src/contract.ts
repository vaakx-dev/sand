import { isContextRecord, promptInput, type ContextRecord, type UserContent } from '@sand/chats/contract'
import type { Draft } from '@sand/composer/contract'
import { request, type } from '@sand/host-hub/contract'
import { sessionSettings } from '@sand/model/contract'
import { z } from 'zod'

const content = z.custom<UserContent>(value => promptInput().safeParse([value]).success, 'Expected attached content')

export const draft = z.object({
  text: z.string(),
  items: z.array(content),
  records: z.array(z.custom<ContextRecord>(isContextRecord)).optional(),
  settings: sessionSettings().optional(),
  target: z.object({ id: z.string(), cwd: z.string(), device: z.string() }).optional(),
  updated: z.number().optional(),
}) satisfies z.ZodType<Draft>

export const draftsRead = request('drafts.read', { input: () => z.object({ key: z.string() }), output: type<Draft | null>() })

export const draftsAll = request('drafts.all', { input: () => z.object({}), output: type<Draft[]>() })

export const draftsWrite = request('drafts.write', { input: () => z.object({ key: z.string(), draft: draft.nullable() }), output: type<void>() })
