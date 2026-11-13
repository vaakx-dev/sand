import { request, type, wireEvent } from '@sand/host-hub/contract'
import type { ThreadUsage } from '@sand/usage/contract'
import { z } from 'zod'

export const usageThread = request('usage.thread', { input: () => z.object({ session: z.string() }), output: type<ThreadUsage>() })

export const usageThreadChange = wireEvent<ThreadUsage>('usage.thread.change')
