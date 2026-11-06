import { efforts, type ModelInfo, type ModelPrice } from '@sand/accounts/contract'
import { modelSource } from '@sand/model/contract'
import type { ModelChoice } from './contract'

export interface Catalog {
  models: ModelInfo[]
  price(model: string): ModelPrice | undefined
}

const lowestEffort = (model: ModelInfo) => efforts.find(effort => model.efforts.includes(effort))

export const quickChoice = ({ models, price }: Catalog, main: string | undefined): ModelChoice => {
  if (!main) return {}
  const priced = models.flatMap(model => {
    const output = !model.hidden && modelSource(model.id) === modelSource(main) ? price(model.id)?.output : undefined
    return output === undefined ? [] : [{ model, output }]
  })
  const cheapest = priced.sort((a, b) => a.output - b.output)[0]?.model
  if (!cheapest) return {}
  const effort = lowestEffort(cheapest)
  return { model: cheapest.id, ...(effort && { effort }) }
}
