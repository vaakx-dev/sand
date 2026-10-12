import type { ModelPrice, PlanModel } from '../contract'

export interface Discovered extends PlanModel {
  fast?: boolean
  price?: ModelPrice
}
