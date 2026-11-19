import type { SandConfig } from '@sand/config/contract'
import { z } from 'zod'
import type { ModelPrice } from '../contract'
import { cached } from './cached'

interface UserPrice {
  price: ModelPrice
  updated: number
}

type UserPrices = Record<string, UserPrice>

interface PriceListOptions {
  settings: UserPrices
  config: SandConfig
  borrowed(): UserPrices[]
  changed(): void
}

const priceSchema = z
  .object({
    input: z.number(),
    output: z.number(),
    cache_read: z.number(),
    cache_write: z.number(),
    cache_write_long: z.number().optional(),
    updated: z.number().default(0),
  })
  .transform(
    ({ input, output, cache_read, cache_write, cache_write_long, updated }): UserPrice => ({
      price: {
        input,
        output,
        cacheRead: cache_read,
        cacheWrite: cache_write,
        ...(cache_write_long !== undefined && { cacheWriteLong: cache_write_long }),
      },
      updated,
    }),
  )

const fieldsOf = ({ price: { input, output, cacheRead, cacheWrite, cacheWriteLong }, updated }: UserPrice) => ({
  input,
  output,
  cache_read: cacheRead,
  cache_write: cacheWrite,
  cache_write_long: cacheWriteLong,
  updated,
})

const newest = (lists: UserPrices[]) => {
  const pooled = new Map<string, UserPrice>()
  for (const list of lists)
    for (const [model, found] of Object.entries(list)) {
      const best = pooled.get(model)
      if (!best || found.updated > best.updated) pooled.set(model, found)
    }
  return pooled
}

class PriceList {
  readonly #own: Map<string, UserPrice>
  readonly #config: SandConfig
  readonly #changed: () => void
  readonly #pooled: ReturnType<typeof cached<Map<string, UserPrice>>>

  constructor({ settings, config, borrowed, changed }: PriceListOptions) {
    this.#own = new Map(Object.entries(settings))
    this.#config = config
    this.#changed = changed
    this.#pooled = cached(() => newest([Object.fromEntries(this.#own), ...borrowed()]))
  }

  get(model: string) {
    return this.#pooled.get().get(model)?.price
  }

  own(): UserPrices {
    return Object.fromEntries(this.#own)
  }

  reset() {
    this.#pooled.reset()
  }

  async set(model: string, price: ModelPrice) {
    const set = { price, updated: Date.now() }
    await this.#config.set(['plugins', 'accounts', 'prices', model], fieldsOf(set))
    this.#own.set(model, set)
    this.reset()
    this.#changed()
  }
}

export { PriceList, priceSchema, type UserPrices }
