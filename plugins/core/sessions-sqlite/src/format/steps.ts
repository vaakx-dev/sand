import type { Entry } from '@sand/messages'

export interface FormatStep {
  to: number
  entry(entry: Entry): Entry | null
}

export const steps: FormatStep[] = []
