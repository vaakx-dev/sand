export interface StepOutcome {
  state: 'ok' | 'fail' | 'skip'
  output?: string
}
