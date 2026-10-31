import type { GitPlace, GitStatus } from '@sand/git/contract'
import type { IconName } from '@sand/ui-kit/contract'
import type { Thread } from '@sand/web-client/contract'
import type { Child } from '@vaakx-dev/vrui'
import { type Dispose, service } from 'drydock'

export interface GitMenuContext {
  status: GitStatus
  place: GitPlace
  thread?: Thread
  waiting?: string
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

export interface GitButton {
  label: string
  short?: string
  icon?: IconName
  title?: string
  disabled?: boolean
  reason?: string
}

export type GitBaseId = 'commit' | 'commit-push' | 'push' | 'pull' | 'diverged' | 'detached'

export interface GitBaseAction extends GitButton {
  id: GitBaseId
}

export const gitBaseRank = 100

export interface GitActionChoice extends GitButton {
  rank: number
}

export interface GitActionContext {
  status: GitStatus
  place: GitPlace
  thread?: Thread
  base?: GitBaseAction
}

export interface GitCommitRequest {
  paths?: string[]
  message?: string
  push: boolean
}

export interface GitRunContext extends GitActionContext {
  commit(request: GitCommitRequest): Promise<boolean>
  push(): Promise<boolean>
}

export interface GitPrimaryAction {
  id: string
  decide(context: GitActionContext): GitActionChoice | undefined
  run(context: GitRunContext): Promise<void> | void
}

export interface GitActions {
  register(action: GitPrimaryAction): Dispose
}

export interface GitControl {
  menu: GitMenu
  actions: GitActions
}

export const gitControl = service<GitControl>('gitControl')
