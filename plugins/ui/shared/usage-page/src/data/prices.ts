import type { ModelPrice } from '@sand/accounts/contract'
import type { Wire } from '@sand/devices-contract'
import { unanswered } from '@sand/host-hub/contract'
import { usagePrices } from '@sand/usage/contract'
import { errorMessage } from '@sand/util'
import { effect, sig } from '@vaakx-dev/vrui'
import type { Prices } from './reprice'

const SEPARATOR = '\n'

export const unpricedModels = (summaries: { unpriced: { model: string }[] }[]) =>
  [...new Set(summaries.flatMap(({ unpriced }) => unpriced.map(item => item.model)))].toSorted().join(SEPARATOR)

const pricesOf = (found: Record<string, ModelPrice>): Prices => new Map(Object.entries(found))

export const priceLoader = (wire: Wire, wanted: () => string, reloaded: () => number) => {
  const prices = sig<Prices>(new Map())
  const failure = sig('')
  effect(() => {
    reloaded()
    const models = wanted().split(SEPARATOR).filter(Boolean)
    if (!models.length) return
    wire
      .call(usagePrices, { models })
      .then(found => {
        prices.set(pricesOf(found))
        failure.set('')
      })
      .catch(error => failure.set(unanswered(error) ? '' : errorMessage(error)))
  })
  return { prices, failure }
}
