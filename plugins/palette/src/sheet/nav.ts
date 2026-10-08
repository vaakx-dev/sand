import type { PalettePage } from '@sand/protocol'
import type { Sig } from '@sand/dom'

export interface PageMemory {
  text?: Sig<string>
  selected?: number
}

export interface PageNav {
  trail(): PalettePage[]
  push(page: PalettePage): void
  back(to?: number): void
  close(page?: PalettePage): void
  dismiss(): void
  fail(error: unknown): void
  isTop(page: PalettePage): boolean
  hold(page: PalettePage): () => void
  memory(page: PalettePage): PageMemory
}
