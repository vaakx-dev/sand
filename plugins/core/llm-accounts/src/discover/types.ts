import type { Effort, ModelPrice } from '../contract'

export interface Discovered {
  name: string
  label?: string
  context?: number
  efforts?: Effort[]
  defaultEffort?: Effort
  images?: boolean
  fast?: boolean
  price?: ModelPrice
}
