import { isMetered, type LLM, type UsageRecord } from '@sand/accounts/contract'
import { costOf } from '../records'
import { identityResolver } from '../summary/identity'

export const billedCost = (records: UsageRecord[], llm?: LLM) => {
  const identify = identityResolver(llm)
  let cost = 0
  for (const { model = 'unknown', usage, ...tags } of records) {
    const price = llm?.price?.(model)
    if (price && isMetered(identify({ ...tags, model }).billing)) cost += costOf(usage, price)
  }
  return cost
}
