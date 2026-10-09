import type { PalettePage } from '@sand/palette/contract'
import type { Machine } from '@sand/web-client/contract'
import type { CopyDone } from '../contract'
import type { Context } from 'drydock'

export type FlowContext = Context<'projects' | 'machines' | 'threads'>

export type Source = 'Local folder' | 'Git URL' | 'Empty project'

export interface Repo {
  url: string
  name: string
}

export interface Choice {
  machine: Machine
  source: Source
  how: 'add' | 'create-folder' | 'create' | 'clone'
  path: string
  name?: string
  repo?: Repo
  project?: string
  existing?: string
  done?: CopyDone
}

export type Next = (choice: Choice) => PalettePage | Promise<PalettePage>

export const deviceOf = (machine: Machine) => (machine.local ? undefined : machine.id)
