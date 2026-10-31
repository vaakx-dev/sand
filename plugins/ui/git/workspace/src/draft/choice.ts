import type { GitRepoLocal } from '@sand/git/contract'
import type { WorkspaceKind } from '@sand/worktrees/contract'
import { defaultBranch, folderName } from '../paths'

export type WorkspaceChoice = { kind: 'checkout' } | { kind: 'new'; from?: string } | { kind: 'existing'; path: string; branch?: string }

export const checkoutChoice: WorkspaceChoice = { kind: 'checkout' }

export const newChoice: WorkspaceChoice = { kind: 'new' }

export const kindOf = (choice: WorkspaceChoice): WorkspaceKind => (choice.kind === 'checkout' ? 'checkout' : 'worktree')

export const choiceOfKind = (kind: WorkspaceKind | undefined): WorkspaceChoice => (kind === 'worktree' ? newChoice : checkoutChoice)

export const checkoutLabel = (local: GitRepoLocal | undefined) => (local?.worktree ? 'This worktree' : 'Main checkout')

export const choiceLabel = (choice: WorkspaceChoice, local: GitRepoLocal | undefined) => {
  if (choice.kind === 'checkout') return checkoutLabel(local)
  if (choice.kind === 'existing') return choice.branch ?? folderName(choice.path)
  return `New worktree from ${choice.from ?? defaultBranch(local)}`
}
