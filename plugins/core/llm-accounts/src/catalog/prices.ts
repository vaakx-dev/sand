import { z } from 'zod'
import type { ModelPrice } from '../contract'

const rates = (input: number, output: number, cacheRead = input / 10): ModelPrice => ({ input, output, cacheRead, cacheWrite: input * 1.25 })

const table: Record<string, ModelPrice> = {
  'claude-fable-5-1': rates(10, 50, 0.25),
  'claude-fable-5': rates(10, 50),
  'claude-opus-5-5': rates(4, 20, 0.2),
  'claude-opus-5': rates(5, 25),
  'claude-opus-4-8': rates(5, 25),
  'claude-opus-4-7': rates(5, 25),
  'claude-opus-4-6': rates(5, 25),
  'claude-sonnet-5-5': rates(2, 10),
  'claude-sonnet-5': rates(2, 10),
  'claude-sonnet-4-6': rates(3, 15),
  'claude-haiku-5-5': rates(0.1, 0.5),
}

export const priceSchema = z.object({ input: z.number(), output: z.number(), cache_read: z.number().optional(), cache_write: z.number().optional() })

type PriceSetting = z.infer<typeof priceSchema>

const fromSetting = ({ input, output, cache_read, cache_write }: PriceSetting): ModelPrice => ({
  input,
  output,
  cacheRead: cache_read ?? input / 10,
  cacheWrite: cache_write ?? input * 1.25,
})

const baseName = (name: string) => name.replace(/\[[^\]]*\]$/, '').replace(/-\d{8}$/, '')

export const priceList = (settings: Record<string, PriceSetting>) => {
  const custom = new Map(Object.entries(settings).map(([model, setting]) => [model, fromSetting(setting)]))
  return {
    custom: (id: string, name: string) => custom.get(id) ?? custom.get(name) ?? custom.get(baseName(name)),
    known: (name: string) => table[baseName(name)],
  }
}

export type PriceList = ReturnType<typeof priceList>
