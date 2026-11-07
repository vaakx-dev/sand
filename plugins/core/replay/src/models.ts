import type { PlanModel } from '@sand/accounts/contract'
import type { Script } from './contract'

export const planModels = ({ models, price }: Script): PlanModel[] => models.map(name => ({ name, label: name, ...(price && { price }) }))
