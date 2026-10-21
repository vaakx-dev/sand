import type { SandConfig } from '@sand/config/contract'
import { z } from 'zod'

const schema = z.object({
  port: z.number().int().min(0).default(4317),
  name: z.string().optional(),
  watch: z.boolean().default(false),
  drain_minutes: z.number().positive().default(30),
})

export const hostSettings = ({ path, section }: SandConfig) => {
  const parsed = schema.safeParse(section('host') ?? {})
  if (!parsed.success) throw new Error(`${path} [host]: ${z.prettifyError(parsed.error)}`)
  const { port, name, watch, drain_minutes } = parsed.data
  return { port, name, watch, drainTimeout: drain_minutes * 60_000 }
}
