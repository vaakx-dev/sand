import type { LLM } from '@sand/llm-accounts/contract'
import type { ModelUsage, UnpricedModel } from '../contract'
import type { AccountId } from './identity'
import type { Turn } from './turns'
import { tokensOf } from '@sand/kit'
import { grouped } from './grouped'
import { byCost, emptyTotals } from './totals'

const nameOf = (model: string) => model.slice(model.indexOf('/') + 1)

export const modelBook = (llm?: LLM) => {
  const labels = new Map<string, string>()
  const labelOf = (model: string, name: string) =>
    grouped(labels, model, () => llm?.find?.(model)?.label ?? llm?.find?.(name)?.label ?? name)
  const models = new Map<string, ModelUsage>()
  const unpriced = new Map<string, UnpricedModel>()

  const add = (turn: Turn, id: AccountId, priced: boolean) => {
    const name = nameOf(turn.model)
    if (!priced && id.billing !== 'local') {
      const entry = grouped(unpriced, name, () => ({ model: name, turns: 0, tokens: 0 }))
      entry.turns++
      entry.tokens += tokensOf(turn.usage)
    }
    return grouped(models, `${id.key}\n${turn.model}`, () => ({
      ...emptyTotals(),
      model: turn.model,
      name,
      label: labelOf(turn.model, name),
      provider: id.provider,
      account: id.key,
    }))
  }

  const finish = () => ({
    models: [...models.values()].sort(byCost),
    unpriced: [...unpriced.values()].sort((a, b) => b.tokens - a.tokens),
  })

  return { add, finish }
}
