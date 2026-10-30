import { service } from 'drydock'

export type PcTone = 'ok' | 'wait' | 'off' | 'bad'

export interface PcMarks {
  tone(pc: string): PcTone
  words(pc: string): string
  dot(pc: string): HTMLElement
  why(pc: string): void
}

export const pcMarks = service<PcMarks>('pcMarks')
