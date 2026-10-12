import type { Dispose } from 'drydock'

export interface SettingsPage {
  id: string
  label: string
  icon?: string
  order?: number
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

declare module 'drydock' {
  interface Services {
    settings: Settings
  }

  interface Events {
    'settings.change': (page: string | undefined) => void
  }
}
