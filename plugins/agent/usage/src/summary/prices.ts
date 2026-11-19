import type { LLM, ModelPrice } from '@sand/accounts/contract'

export const pricesHandler =
  (llm: () => LLM | undefined) =>
  ({ models }: { models: string[] }) => {
    const priced = models.flatMap((model): [string, ModelPrice][] => {
      const price = llm()?.price?.(model)
      return price ? [[model, price]] : []
    })
    return Object.fromEntries(priced)
  }
