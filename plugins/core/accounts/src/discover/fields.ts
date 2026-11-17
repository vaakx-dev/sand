import { z } from 'zod'

export const text = z.string().min(1).optional().catch(undefined)

export const count = z.number().positive().optional().catch(undefined)

export const flag = z
  .object({ supported: z.literal(true) })
  .transform(() => true)
  .catch(false)

export const modelId = z.object({ id: z.string().min(1) })

const listed = z.object({ data: z.array(z.unknown()) })

export const listIn = (source: string, body: unknown): unknown[] => {
  const found = listed.safeParse(body)
  if (!found.success) throw new Error(`${source} model list failed: unexpected answer`)
  return found.data.data
}
