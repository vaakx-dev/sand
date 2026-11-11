import type { PlanModel } from '@sand/accounts/contract'
import type { Script } from './contract'

export const planModels = ({ models, price }: Script): PlanModel[] =>
  models.map(model => {
    const { name, label = name, efforts } = typeof model === 'string' ? { name: model } : model
    return { name, label, ...(efforts && { efforts }), ...(price && { price }) }
  })
