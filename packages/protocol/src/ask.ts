export type AskKind = 'single' | 'multi' | 'confirm' | 'rank' | 'text'

export interface AskOption {
  label: string
  description?: string
  preview?: string
  recommended?: boolean
}

export interface AskQuestion {
  name: string
  question: string
  type: AskKind
  options: AskOption[]
  detail?: string
  risky?: boolean
}

export interface AskAnswer {
  picked?: number[]
  text?: string
}
