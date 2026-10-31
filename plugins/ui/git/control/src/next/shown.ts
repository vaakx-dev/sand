import type { GitPhase } from '@sand/git-actions/contract'
import type { GitButton } from '../contract'
import { waitReason } from './facts'
import { phaseLabels } from './phases'

export interface RunState {
  running: boolean
  phase?: GitPhase
}

export interface ShownButton extends GitButton {
  busy?: boolean
}

export const shownButton = (button: GitButton | undefined, state: RunState): ShownButton | undefined => {
  if (state.phase) {
    const label = phaseLabels[state.phase]
    return { label, short: label, busy: true, disabled: true }
  }
  if (!button || button.disabled || !state.running) return button
  return { ...button, disabled: true, reason: waitReason }
}
