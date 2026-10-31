import type { GitPhase } from '@sand/git-actions/contract'

export const phaseLabels: Record<GitPhase, string> = {
  message: 'Writing message…',
  stage: 'Staging…',
  hooks: 'Running hooks…',
  commit: 'Committing…',
  push: 'Pushing…',
  pull: 'Pulling…',
  switch: 'Switching branch…',
  init: 'Starting repo…',
}
