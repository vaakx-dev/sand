import { event, service, type Dispose } from 'drydock'

export interface SettingsPage {
  id: string
  label: string
  icon?: string
  order?: number
  parent?: string
  dot?: () => boolean
  render(): HTMLElement
}

export interface SettingsSection {
  page: string
  id: string
  order?: number
  render(): HTMLElement
}

export interface Settings {
  page(page: SettingsPage): Dispose
  section(section: SettingsSection): Dispose
  pages(): SettingsPage[]
  open(id?: string): void
  close(): void
  current(): string | undefined
}

export const settings = service<Settings>('settings')
export const settingsChange = event<(page: string | undefined) => void>('settings.change')
