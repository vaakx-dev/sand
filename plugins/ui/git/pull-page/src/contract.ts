import type { PullRef } from '@sand/github/contract'
import type { PullDetail } from '@sand/pull-detail/contract'
import { type Dispose, service } from 'drydock'

export interface PullTab {
  id: string
  title: string
  order?: number
  count?(pull: PullDetail): number | undefined
  render(pull: PullRef, host: HTMLElement): Dispose | void
}

export interface PullPage {
  open(pull?: PullRef): void
  close(): void
  tab(tab: PullTab): Dispose
}

export const pullPage = service<PullPage>('pullPage')
