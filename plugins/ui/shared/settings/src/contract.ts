import { event, service, type Dispose } from 'drydock'

export type SettingsGroup = 'everyday' | 'agents' | 'accounts' | 'workspace' | 'app'

export interface SettingsItem {
  id: string
  label: string
  keywords?: string[]
}

export interface SettingsPage {
  id: string
  label: string
  icon?: string
  group?: SettingsGroup
  order?: number
  parent?: string
  items?: SettingsItem[]
  back?(): (() => void) | undefined
  dot?: () => boolean
  render?(): HTMLElement
}

export interface SettingsSection {
  page: string
  id: string
  order?: number
  items?: SettingsItem[]
  render(): HTMLElement
}

export interface Settings {
  page(page: SettingsPage): Dispose
  section(section: SettingsSection): Dispose
  pages(): SettingsPage[]
  open(id?: string, item?: string): void
  close(): void
  current(): string | undefined
}

export const settingAttribute = 'data-setting'

export const settingMark = (item: string) => ({ [settingAttribute]: item })

export const settings = service<Settings>('settings')
export const settingsChange = event<(page: string | undefined) => void>('settings.change')
