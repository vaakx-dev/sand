import type { GitPlace, GitStatus } from '@sand/git/contract'
import type { Thread } from '@sand/web-client/contract'
import type { Child } from '@vaakx-dev/vrui'
import { type Dispose, service } from 'drydock'

export interface GitMenuContext {
  status: GitStatus
  place: GitPlace
  thread?: Thread
  close(): void
}

export interface GitMenuSection {
  id: string
  order?: number
  items(context: GitMenuContext): Child[]
}

export interface GitMenu {
  section(section: GitMenuSection): Dispose
}

export const gitMenu = service<GitMenu>('gitMenu')
