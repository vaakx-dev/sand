import { z } from 'zod'
import type { ModelPrice } from '../contract'

export const priceSchema = z
  .object({ input: z.number(), output: z.number(), cache_read: z.number(), cache_write: z.number(), cache_write_long: z.number().optional() })
  .transform(
    ({ input, output, cache_read, cache_write, cache_write_long }): ModelPrice => ({
      input,
      output,
      cacheRead: cache_read,
      cacheWrite: cache_write,
      ...(cache_write_long !== undefined && { cacheWriteLong: cache_write_long }),
    }),
  )

export const priceList = (settings: Record<string, ModelPrice>) => {
  const prices = new Map(Object.entries(settings))
  return (model: string) => prices.get(model)
}

export type PriceList = ReturnType<typeof priceList>
