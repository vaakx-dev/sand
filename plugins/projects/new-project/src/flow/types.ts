import type { PalettePage } from '@sand/palette/contract'
import type { Machine } from '@sand/web-client/contract'
import type { CopyDone } from '../contract'

export type Source = 'Local folder' | 'Git URL' | 'Empty project'

export interface Repo {
  url: string
  name: string
}

interface Picked {
  machine: Machine
  source: Source
  path: string
  name: string
  project?: string
  existing?: string
  done?: CopyDone
}

export type Choice = Picked & ({ how: 'add' | 'create-folder' | 'create' } | { how: 'clone'; repo: Repo })

export type Next = (choice: Choice) => PalettePage | Promise<PalettePage>
