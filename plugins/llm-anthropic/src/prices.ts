import type { ModelPrice } from '@sand/protocol'

const rates = (input: number, output: number, cacheRead = input / 10): ModelPrice => ({ input, output, cacheRead, cacheWrite: input * 1.25 })

const prices: Record<string, ModelPrice> = {
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

const base = (model: string) => model.replace(/\[.*\]$/, '').replace(/-\d{8}$/, '')

export const priceOf = (model: string): ModelPrice | undefined => prices[base(model)]
