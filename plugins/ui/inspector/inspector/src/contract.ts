import type { Subject } from '@sand/ui-shell/contract'
import { service, type Dispose } from 'drydock'

export interface InspectorRow {
  id: string
  group: string
  order: number
  shows(subject: Subject): boolean
  render(subject: () => Subject): HTMLElement
}

export interface Inspector {
  row(row: InspectorRow): Dispose
}

export const inspector = service<Inspector>('inspector')
