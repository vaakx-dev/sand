import type { WebCommand } from '@sand/commands/contract'

export const moveCommand = (openMove: () => void): WebCommand => ({
  name: 'worktree',
  title: 'Move to worktree',
  description: 'Move this thread into its own git worktree and branch, taking its changes with it',
  source: 'local',
  run: () => openMove(),
})
