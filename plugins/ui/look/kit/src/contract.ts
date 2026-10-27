import type { NavAction } from '@sand/nav/contract'
import { service } from 'drydock'
import type { kit as kitImpl } from './kit'

export type Kit = typeof kitImpl

export interface PressAt {
  x: number
  y: number
  touch: boolean
  from: HTMLElement
}

export interface MenuSpec {
  title: string
  subtitle?: string
  actions: NavAction[]
}

export interface MenuRequest extends PressAt, MenuSpec {
  ask?: string
  expand?: string
}

export type { ContextMenu } from './context-menu/menu'
export type { Direction } from './gesture/direction'
export type { Drag } from './gesture/follow'
export type { Listbox, ListboxOptions } from './listbox/model'
export type { IconName, IconSize } from './icons/lucide'
export type { MarkerProps } from './marks/marker'
export type { Tone } from './marks/marks'
export type { StepState } from './marks/state-marks'
export type { RunStatus } from './marks/status'
export type { CalloutLook } from './notes/notes'
export type { ListRowProps } from './rows/list-row'
export type { SettingsRowProps } from './rows/rows'
export type { Choice } from './rows/settings'
export type { SheetSize } from './sheets/overlay'
export type { Surface } from './surface'

export const kit = service<Kit>('kit')
