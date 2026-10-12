import type { ProjectLook } from '../projects'

export type NavItemState = 'idle' | 'running' | 'background' | 'waiting' | 'draft'

export interface NavItem {
  id: string
  title: string
  subtitle?: string
  subtitleIcon?: string
  path?: string
  project?: string
  projectKey?: string
  icon?: ProjectLook
  group?: string
  updated?: number
  started?: number
  state: NavItemState
  agents?: number
  shells?: number
  workflow?: { done: number; total: number }
  unread?: boolean
  pinned?: boolean
  settled?: boolean
  snoozed?: number
  back?: boolean
  movable?: boolean
  meta?: string
  creator?: NavCreator
}

export interface NavCreator {
  label: string
  open?(): void
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
  group?: string
  quick?: boolean
  tile?: boolean
  active?: boolean
  danger?: boolean
  confirm?: string
  choices?: NavChoice[]
  ask?: NavAsk
  run(): void | Promise<unknown>
}

export interface NavChoice {
  id: string
  label: string
  tip?(): string
  run(): void | Promise<unknown>
}

export interface NavAsk {
  placeholder: string
  tip: string
  submit: string
  preview(text: string): string | undefined
  run(text: string): void | Promise<unknown>
}

export interface NavEntry {
  key: string
  group: string
  movable: boolean
  list: NavList
  item: NavItem
  selected: boolean
  pick(): void
}
