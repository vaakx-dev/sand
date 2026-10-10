import type { Dispose } from 'drydock'
import type { Handle } from '../types'

export type NavItemState = 'idle' | 'running' | 'background' | 'waiting' | 'draft'

export interface NavItem {
  id: string
  title: string
  subtitle?: string
  path?: string
  project?: string
  projectKey?: string
  icon?: string
  group?: string
  updated?: number
  started?: number
  state: NavItemState
  jobs?: number
  workflow?: { done: number; total: number }
  unread?: boolean
  pinned?: boolean
  settled?: boolean
  movable?: boolean
  meta?: string
}

export interface NavList {
  id: string
  title: string
  order?: number
  items(): NavItem[]
  selected?(): string | undefined
  select(id: string): void
  prefetch?(id: string): void
  menu?(id: string): NavAction[]
  move?(id: string, above: string | undefined, below: string | undefined): void
}

export interface NavAction {
  id: string
  label: string
  icon?: string
  order?: number
  wide?: boolean
  place?: 'footer'
  end?: boolean
  run(): void | Promise<unknown>
}

export interface Nav {
  list(list: NavList): Handle<NavList>
  action(action: NavAction): Dispose
}
