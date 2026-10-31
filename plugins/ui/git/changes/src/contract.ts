import type { DiffScope } from '@sand/git-diff/contract'
import type { GitPlace } from '@sand/git/contract'
import type { IconName } from '@sand/ui-kit/contract'
import type { Sig } from '@vaakx-dev/vrui'
import { type Dispose, service } from 'drydock'

export interface ChangesScope {
  id: string
  label: string
  detail?: string
  group?: string
  icon?: IconName
  stat?: { add: number; del: number }
  scope: DiffScope
  fixed?: boolean
}

export interface ChangesScopeSource {
  id: string
  order?: number
  scopes(place: GitPlace): Sig<ChangesScope[]> | ChangesScope[]
}

export interface ChangesScopes {
  register(source: ChangesScopeSource): Dispose
}

export interface ChangesPanel {
  scopes: ChangesScopes
  show(scope?: string): void
}

export const changesPanel = service<ChangesPanel>('changesPanel')
