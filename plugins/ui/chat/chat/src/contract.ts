import type { WaitReason } from '@sand/turns-contract/contract'
import { draftRouteKind, threadRouteKind } from '@sand/web-client/contract'
import { type Dispose, service } from 'drydock'

export const threadRoute = threadRouteKind

export const draftRoute = draftRouteKind

export const threadScheme = 'thread'

export interface ThreadView {
  render(thread: string): HTMLElement
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
}

export const threadOwners = service<ThreadOwners>('threadOwners')

export interface DraftPlaces {
  choose(draft: string): void
}

export const draftPlaces = service<DraftPlaces>('draftPlaces')

export interface Waiting {
  thread: string
  device: string
  reason: WaitReason
}

export interface WaitLine {
  kind: WaitReason['kind']
  render(waiting: Waiting): HTMLElement
}

export interface WaitLines {
  add(line: WaitLine): Dispose
  of(kind: WaitReason['kind']): WaitLine | undefined
}

export const waitLines = service<WaitLines>('waitLines')
