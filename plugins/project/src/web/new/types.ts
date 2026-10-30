import type { PcView } from '@sand/devices-contract'
import type { PalettePage } from '@sand/palette/contract'

export type Source = 'Local folder' | 'Empty project'

export interface Choice {
  pc: PcView
  source: Source
  how: 'add' | 'create-folder' | 'create'
  path: string
  name: string
  project?: string
  existing?: string
}

export type Next = (choice: Choice) => PalettePage | Promise<PalettePage>
