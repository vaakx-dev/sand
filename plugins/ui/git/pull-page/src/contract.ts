import type { PullRef } from '@sand/github/contract'
import type { PullDetail } from '@sand/pull-detail/contract'
import type { Child } from '@vaakx-dev/vrui'
import { type Dispose, service } from 'drydock'

export interface PullTab {
  id: string
  title: string
  order?: number
  count?(pull: PullDetail): number | undefined
  render(pull: PullRef, host: HTMLElement): Dispose | void
}

export interface PullMenuContext {
  pull: PullDetail
  close(): void
}

export interface PullMenu {
  id: string
  order?: number
  items(context: PullMenuContext): Child[]
}

export interface PullPage {
  open(pull?: PullRef): void
  close(): void
  tab(tab: PullTab): Dispose
  menu(menu: PullMenu): Dispose
}

export const pullPage = service<PullPage>('pullPage')
