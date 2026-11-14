import { z } from 'zod'
import type { ModelPrice } from '../contract'
import { writePrice } from './price-file'

const priceSchema = z
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

class PriceList {
  readonly #prices: Map<string, ModelPrice>
  readonly #path: string

  constructor(settings: Record<string, ModelPrice>, path: string) {
    this.#prices = new Map(Object.entries(settings))
    this.#path = path
  }

  get(model: string) {
    return this.#prices.get(model)
  }

  async set(model: string, price: ModelPrice) {
    await writePrice(this.#path, model, price)
    this.#prices.set(model, price)
  }
}

export { PriceList, priceSchema }
