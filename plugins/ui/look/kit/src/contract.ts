import type { kit } from './kit'

export type Kit = typeof kit

export type { ContextMenu } from './context-menu/menu'
export type { IconName } from './icons/lucide'
export type { MarkerProps } from './marks/marker'
export type { Tone } from './marks/marks'
export type { StepState } from './marks/state-marks'
export type { RunStatus } from './marks/status'
export type { CalloutLook } from './notes/notes'
export type { Choice } from './rows/settings'
export type { SheetSize } from './sheets/overlay'

declare module 'drydock' {
  interface Services {
    kit: Kit
  }
}
