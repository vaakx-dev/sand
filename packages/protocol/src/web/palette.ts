import type { Dispose } from 'drydock'

export interface PaletteItem {
  id: string
  group?: string
  label: string
  detail?: string
  meta?: string
  icon?: string
  avatar?: string
  avatarIcon?: string
  busy?: boolean
  search?: string
  disabled?: boolean
  fill?: string
  actions?: PaletteItemAction[]
  page?(): PalettePage
  run?(): void | Promise<void>
}

export interface PaletteItemAction {
  label: string
  danger?: boolean
  run(): void | Promise<void>
}

export interface PaletteCard {
  label?: string
  icon?: string
  title: string
  detail?: string
  mono?: boolean
  warn?: boolean
}

export interface PaletteAction {
  label: string
  enabled: boolean
}

export interface PaletteField {
  kind: 'path' | 'url' | 'text'
  value: string
  placeholder?: string
  action(value: string): PaletteAction
  submit(value: string): void | PalettePage | Promise<void | PalettePage>
}

export interface PaletteReviewRow {
  label: string
  value: string
  mono?: boolean
}

export interface PaletteReview {
  rows: PaletteReviewRow[]
  action: string
  run(progress: (text: string) => void): void | Promise<void>
}

export interface PalettePage {
  id: string
  title: string
  placeholder?: string
  empty?: string | ((query: string) => string)
  filter?: boolean
  delay?: number
  items?(query: string): PaletteItem[] | Promise<PaletteItem[]>
  field?: PaletteField
  card?(value: string): PaletteCard | undefined
  review?: PaletteReview
}

export interface PaletteSource {
  id: string
  page?: string
  order?: number
  items(query: string): PaletteItem[]
}

export interface Palette {
  open(start?: string | PalettePage): void
  close(): void
  source(source: PaletteSource): Dispose
  items(page: string, query: string): PaletteItem[]
}
