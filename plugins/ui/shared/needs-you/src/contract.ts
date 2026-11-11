import type { Child } from '@vaakx-dev/vrui'
import { service, type Dispose } from 'drydock'

export type NeedKind = 'question' | 'secret' | 'review'

export interface Need {
  id: string
  kind: NeedKind
  who: string
  mark?(): Child
  title: string
  at: number
  thread?: string
  owner?: string
  open?(): void
  render(): Child
}

export interface NeedSource {
  id: string
  items(): Need[]
}

export interface Needs {
  source(source: NeedSource): Dispose
  list(): Need[]
  open(): void
}

export const needs = service<Needs>('needs')
