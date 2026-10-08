import type { Dispose } from 'drydock'

export interface SettingsPage {
  id: string
  label: string
  icon?: string
  order?: number
  render(): HTMLElement
}

export interface Settings {
  page(page: SettingsPage): Dispose
  pages(): SettingsPage[]
  open(id?: string): void
  close(): void
  current(): string | undefined
}
