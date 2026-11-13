import type { Child } from '@vaakx-dev/vrui'
import { service, type Dispose } from 'drydock'

export type NeedKind = 'permission' | 'secret' | 'conflict' | 'review'

export interface NeedAction {
  label: string
  run(): void | Promise<unknown>
}

export interface Need {
  id: string
  kind: NeedKind
  who: string
  mark(): Child
  title: string
  head?(): Child
  body?(actions: Child[]): Child
  text?(): Child
  at: number
  actions: [NeedAction, ...NeedAction[]]
}

export interface NeedSource {
  id: string
  items(): Need[] | undefined
}

export interface Needs {
  source(source: NeedSource): Dispose
  list(): Need[] | undefined
  open(): void
}

export const needs = service<Needs>('needs')
