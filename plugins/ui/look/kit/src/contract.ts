import type { MenuAction } from '@sand/ui-shell/contract'
import { service } from 'drydock'
import type { kit as kitImpl } from './kit'

export * from './gesture'

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
  actions: MenuAction[]
}

export interface MenuRequest extends PressAt, MenuSpec {
  ask?: string
  expand?: string
}

export type { CardProps } from './cards/card'
export type { ContextMenu } from './context-menu/menu'
export type { EditableProps } from './fields/editable'
export type { TextAreaProps } from './fields/field'
export type { Direction } from './gesture/direction'
export type { Drag } from './gesture/follow'
export type { PageBodyProps } from './heads/page-body'
export type { HeadingAction } from './heads/section-heading'
export type { Listbox, ListboxOptions } from './listbox/model'
export type { IconName, IconSize } from './icons/lucide'
export type { FileChangeKind } from './marks/file-kind'
export type { MarkerProps } from './marks/marker'
export type { Tone } from './marks/marks'
export type { FaceOptions, FaceState } from './marks/face'
export type { Tint } from './marks/monogram'
export type { WorkState } from './marks/state-icon'
export type { StepState } from './marks/state-marks'
export type { ChipRowProps } from './menus/chip-row'
export type { CountChipProps } from './menus/count-chip'
export type { PickerButtonProps } from './menus/picker'
export type { RunStatus } from './marks/status'
export type { CalloutLook } from './notes/notes'
export type { CheckRowProps } from './rows/check-row'
export type { ChoiceInput, ListChoice } from './rows/choice-list'
export type { ListRowProps } from './rows/list-row'
export type { RowPlaceProps, WorkRowBody, WorkRowProps } from './rows/work-row'
export type { SettingsRowProps } from './rows/rows'
export type { SectionProps } from './rows/section'
export type { Choice } from './rows/settings'
export type { SheetSize } from './sheets/overlay'
export type { EmptyAction } from './states/states'
export type { Surface } from './surface'
export type { TabProps } from './tabs/tabs'
export type { DiffLine } from './tools/lcs'

export const kit = service<Kit>('kit')
