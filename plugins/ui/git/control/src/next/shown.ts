import type { GitPhase } from '@sand/git-actions/contract'
import type { GitButton } from '../contract'
import { phaseLabels } from './phases'

export interface RunState {
  running: boolean
  phase?: GitPhase
}

export interface ShownButton extends GitButton {
  busy?: boolean
}

export const shownButton = (button: GitButton | undefined, state: RunState): ShownButton | undefined => {
  if (state.phase) return { label: phaseLabels[state.phase], busy: true }
  return state.running ? undefined : button
}
