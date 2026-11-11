import type { Derive } from '@vaakx-dev/vrui'
import type { AddedProject } from '../../contract'

export interface Action {
  label: string
  busy?: string
  opens?: boolean
  run?(): Promise<AddedProject>
}

export interface Step {
  body: HTMLElement
  action?: Derive<Action>
}
