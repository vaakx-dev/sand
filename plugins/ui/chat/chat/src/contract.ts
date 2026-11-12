import type { Entry } from '@sand/chats/contract'
import type { Status } from '@sand/ui-shell/contract'
import { draftRouteKind, threadRouteKind } from '@sand/web-client/contract'
import { service } from 'drydock'

export const threadRoute = threadRouteKind

export const draftRoute = draftRouteKind

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

export interface ThreadOwner {
  id: string
  label: string
  color: string
  open(thread: string): void
}

export interface ThreadOwners {
  owner(thread: string): ThreadOwner | undefined
  sender(thread: string, entry: Entry): ThreadOwner | undefined
}

export const threadOwners = service<ThreadOwners>('threadOwners')

export interface DraftPlaces {
  choose(draft: string): void
}

export const draftPlaces = service<DraftPlaces>('draftPlaces')
