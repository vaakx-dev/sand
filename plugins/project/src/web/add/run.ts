import type { Derive } from '@vaakx-dev/vrui'
import type { AddedProject } from '../../contract'

export interface Action {
  label: string
  /** Shown on the button while it runs, such as "Cloning…". */
  busy?: string
  /** The project already exists, so finishing opens it instead of reporting it added. */
  opens?: boolean
  run?(): Promise<AddedProject>
}

export interface Step {
  body: HTMLElement
  action?: Derive<Action>
}
