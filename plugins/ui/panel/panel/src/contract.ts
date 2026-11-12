import type { Subject } from '@sand/ui-shell/contract'
import { service, type Dispose } from 'drydock'

export interface PanelTab {
  id: string
  label: string
  icon: string
  order: number
  shows(subject: Subject): boolean
  render(subject: () => Subject): HTMLElement
}

export interface Panel {
  tab(tab: PanelTab): Dispose
  show(tab: string): void
  showing(tab: string, subject: Subject): boolean
}

export const panel = service<Panel>('panel')
