import type { Derive } from '@vaakx-dev/vrui'
import { service, type Dispose } from 'drydock'

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
  dot?: () => boolean
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

export interface NavHost {
  action(action: NavAction): Dispose
  actions: Derive<NavAction[]>
  busy(id: string): boolean
  run(action: NavAction): void
}

export const nav = service<NavHost>('nav')
export const sidebar = service<object>('sidebar')
