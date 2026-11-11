import type { Entry } from '@sand/chats/contract'
import type { Monogram, Status } from '@sand/ui-shell/contract'
import { service } from 'drydock'

export const threadRoute = 'thread'

export const draftRoute = 'draft'

export const threadScheme = 'thread'

export interface ThreadLive {
  id: string
  title: string
  status: Status
  note: string
  at: number
}

export interface ThreadView {
  render(thread: string): HTMLElement
  live(thread: string): ThreadLive | undefined
  open(thread: string): void
}

export const threadView = service<ThreadView>('threadView')

export interface ThreadOwner extends Monogram {
  id: string
  label: string
  open(thread: string): void
}

export interface ThreadOwners {
  owner(thread: string): ThreadOwner | undefined
  sender(thread: string, entry: Entry): ThreadOwner | undefined
}

export const threadOwners = service<ThreadOwners>('threadOwners')
