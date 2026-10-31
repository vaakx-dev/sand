import type { DiffScope } from '@sand/git-diff/contract'
import type { GitRepoLocal } from '@sand/git/contract'
import type { IconName } from '@sand/ui-kit/contract'

export const allChanges: DiffScope = { kind: 'all' }

export const uncommitted: DiffScope = { kind: 'uncommitted' }

export interface ScopeChoice {
  scope: DiffScope
  icon: IconName
  label(base?: string): string
  detail?: string
}

export const scopeChoices: ScopeChoice[] = [
  {
    scope: allChanges,
    icon: 'branch',
    label: base => (base ? `All changes vs ${base}` : 'All changes'),
    detail: 'Commits on this branch plus uncommitted work',
  },
  { scope: uncommitted, icon: 'folder', label: () => 'Uncommitted' },
]

export const sameScope = (a: DiffScope | undefined, b: DiffScope | undefined) => JSON.stringify(a) === JSON.stringify(b)

export const defaultScope = (local: GitRepoLocal) => (local.worktree || (Boolean(local.branch) && !local.isDefault) ? allChanges : uncommitted)

export const scopeLabel = (scope: DiffScope | undefined, base?: string) => scopeChoices.find(choice => sameScope(choice.scope, scope))?.label(base) ?? 'Changes'
