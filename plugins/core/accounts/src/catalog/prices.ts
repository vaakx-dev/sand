import type { SandConfig } from '@sand/config/contract'
import { z } from 'zod'
import type { ModelPrice } from '../contract'

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

const fieldsOf = ({ input, output, cacheRead, cacheWrite, cacheWriteLong }: ModelPrice) => ({
  input,
  output,
  cache_read: cacheRead,
  cache_write: cacheWrite,
  cache_write_long: cacheWriteLong,
})

class PriceList {
  readonly #prices: Map<string, ModelPrice>
  readonly #config: SandConfig

  constructor(settings: Record<string, ModelPrice>, config: SandConfig) {
    this.#prices = new Map(Object.entries(settings))
    this.#config = config
  }

  get(model: string) {
    return this.#prices.get(model)
  }

  async set(model: string, price: ModelPrice) {
    await this.#config.set(['plugins', 'accounts', 'prices', model], fieldsOf(price))
    this.#prices.set(model, price)
  }
}

export { PriceList, priceSchema }
