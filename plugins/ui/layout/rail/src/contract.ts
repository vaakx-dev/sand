import type { NavAction } from '@sand/nav/contract'
import { service, type Dispose } from 'drydock'

export interface RailAction extends NavAction {
  current?(): boolean
  within?: string
}

export interface Rail {
  action(action: RailAction): Dispose
}

export const rail = service<Rail>('rail')
