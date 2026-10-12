import type { Highlight } from './code'

export interface Selected {
  from: number
  to: number
  label: string
}

export interface DiffView {
  split: boolean
  wrap: boolean
  compact: boolean
  open: ReadonlySet<string>
  selected(): Selected | undefined
  highlight: Highlight
  expand(id: string): void
  select(at: number): void
  quote(): void
  clear(): void
}
