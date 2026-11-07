import { type Dispose, service } from 'drydock'

export interface WorkSection {
  id: string
  order?: number
  has(bot: string): boolean
  render(bot: string): HTMLElement
}

export interface BotWork {
  section(section: WorkSection): Dispose
}

export const botWork = service<BotWork>('botWork')
