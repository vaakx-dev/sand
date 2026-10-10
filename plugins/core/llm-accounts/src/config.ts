import { z } from 'zod'
import { priceSchema } from './catalog/prices'

export const config = {
  max_tokens: 64_000,
  thinking: undefined as 'summarized' | 'omitted' | undefined,
  max_retries: 4,
  discover_every: 6 * 3_600_000,
}

export type AccountsConfig = typeof config

export const configSchema = z.object({ prices: z.record(z.string(), priceSchema).default({}) }).default({ prices: {} })
