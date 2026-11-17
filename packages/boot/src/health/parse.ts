import type { HostHealth } from '@sand/host-health/contract'
import type { RuntimeHealth } from '@sand/host-runtimes/contract'
import { z } from 'zod'

const runtimes: RuntimeHealth[] = ['starting', 'ready', 'failed', 'restarting']
const logLines = 40

const validOnly = <T extends z.ZodType>(item: T) =>
  z.array(z.unknown()).transform(entries =>
    entries.flatMap(entry => {
      const parsed = item.safeParse(entry)
      return parsed.success ? [parsed.data] : []
    }),
  )

const health = z.object({
  healthy: z.boolean(),
  web: z.boolean(),
  runtime: z.enum(runtimes),
  failedPlugins: validOnly(z.object({ id: z.string(), error: z.string() })),
  log: validOnly(z.string()).transform(lines => lines.slice(-logLines)),
  error: z.string().optional().catch(undefined),
  webError: z.string().optional().catch(undefined),
  build: z.object({ id: z.string().min(1), time: z.number() }).optional().catch(undefined),
})

export const parseHealth = (value: unknown): HostHealth | undefined => health.safeParse(value).data
