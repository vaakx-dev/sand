import type { DiffScope } from '@sand/git-diff/contract'
import type { GitRepoLocal } from '@sand/git/contract'
import type { IconName } from '@sand/ui-kit/contract'
import type { ChangesScope } from '../contract'

export interface ScopeChoice {
  id: string
  scope: DiffScope
  icon: IconName
  label(base?: string): string
  detail?: string
}

export const scopeChoices: ScopeChoice[] = [
  {
    id: 'all',
    scope: { kind: 'all' },
    icon: 'branch',
    label: base => (base ? `All changes vs ${base}` : 'All changes'),
    detail: 'Commits on this branch plus uncommitted work',
  },
  { id: 'uncommitted', scope: { kind: 'uncommitted' }, icon: 'folder', label: () => 'Uncommitted' },
]

const builtIn = (id: string) => scopeChoices.find(choice => choice.id === id)

const extra = (id: string, extras: ChangesScope[]) => extras.find(choice => choice.id === id)

export const sameScope = (a: DiffScope | undefined, b: DiffScope | undefined) => JSON.stringify(a) === JSON.stringify(b)

export const defaultScope = (local: GitRepoLocal) => (local.worktree || (Boolean(local.branch) && !local.isDefault) ? 'all' : 'uncommitted')

export const scopeFor = (id: string, extras: ChangesScope[]) => builtIn(id)?.scope ?? extra(id, extras)?.scope

export const isFixed = (id: string, extras: ChangesScope[]) => Boolean(extra(id, extras)?.fixed)

export const scopeLabel = (id: string | undefined, extras: ChangesScope[], base?: string) =>
  (id && (builtIn(id)?.label(base) ?? extra(id, extras)?.label)) || 'Changes'
