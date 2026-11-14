import type { ProjectLook } from '@sand/project/contract'
import type { Route, Row } from '@sand/ui-shell/contract'
import type { Range } from '@sand/util'
import { service, type Dispose } from 'drydock'

export interface PaletteExcerpt {
  text: string
  marks: Range[]
}

export interface PaletteFace {
  id: string
  tint: string
}

export interface PaletteItem {
  id: string
  group?: string
  label: string
  detail?: string
  excerpt?: PaletteExcerpt
  visits?: string
  meta?: string
  icon?: string
  face?: PaletteFace
  avatar?: string
  avatarIcon?: ProjectLook
  row?(): Row
  search?: string
  disabled?: boolean
  danger?: boolean
  returnAfter?: boolean
  fill?: string
  actions?: PaletteItemAction[]
  page?(): PalettePage
  run?(): void | Promise<void>
}

export interface PaletteItemAction {
  label: string
  icon?: string
  danger?: boolean
  returnAfter?: boolean
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
  browse?: boolean
  empty?: string | ((query: string) => string)
  filter?: boolean
  delay?: number
  items?(query: string): PaletteItem[] | Promise<PaletteItem[]>
  later?(): PaletteLater[]
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

export interface PaletteLateFound {
  items: PaletteItem[]
  note?: string
}

export interface PaletteLater {
  id: string
  group: string
  waiting: string
  items(query: string, signal: AbortSignal): Promise<PaletteLateFound>
}

export interface Palette {
  open(start?: string | PalettePage): void
  close(): void
  source(source: PaletteSource): Dispose
  later(source: PaletteLater): Dispose
  items(page: string, query: string): PaletteItem[]
  used(visits: string): number
}

export const visitsOf = ({ kind, id = '' }: Route) => `${kind}:${id}`

export const palette = service<Palette>('palette')
