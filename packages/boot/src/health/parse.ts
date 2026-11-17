import type { HostHealth } from '@sand/host-health/contract'
import type { RuntimeHealth } from '@sand/host-runtimes/contract'
import { z } from 'zod'

const LOG_LINES = 40

const health = z.object({
  healthy: z.boolean(),
  runtime: z.enum(['starting', 'ready', 'failed', 'restarting'] satisfies RuntimeHealth[]),
  error: z.string().optional(),
  failedPlugins: z.array(z.object({ id: z.string(), error: z.string() })),
  web: z.boolean(),
  webError: z.string().optional(),
  build: z.object({ id: z.string().min(1), time: z.number() }).optional(),
  log: z.array(z.string()).transform(lines => lines.slice(-LOG_LINES)),
})

export const parseHealth = (value: unknown): HostHealth | undefined => health.safeParse(value).data
