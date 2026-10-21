import type { PalettePage } from '@sand/palette/contract'
import type { Machine } from '@sand/web-client/contract'

export type Source = 'Local folder' | 'Empty project'

export interface Choice {
  machine: Machine
  source: Source
  how: 'add' | 'create-folder' | 'create'
  path: string
  name: string
  project?: string
  existing?: string
}

export type Next = (choice: Choice) => PalettePage | Promise<PalettePage>
