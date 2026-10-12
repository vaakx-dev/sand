import type { NavAction } from './nav'

export interface PressAt {
  x: number
  y: number
  touch: boolean
  from: HTMLElement
}

export interface MenuSpec {
  title: string
  subtitle?: string
  actions: NavAction[]
}

export interface MenuRequest extends PressAt, MenuSpec {
  ask?: string
  expand?: string
}
