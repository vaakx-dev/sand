import type { NavAction } from '../../shell/nav/types'
import type { PressAt } from './press'

export interface MenuSpec {
  title: string
  subtitle?: string
  actions: NavAction[]
}

export interface MenuRequest extends PressAt, MenuSpec {
  ask?: string
  expand?: string
}
