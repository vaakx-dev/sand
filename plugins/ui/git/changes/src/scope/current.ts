import { type GitPlace, type GitRepoLocal, placeKey } from '@sand/git/contract'
import { derive, type Sig } from '@vaakx-dev/vrui'
import type { ChangesScope } from '../contract'
import { defaultScope, isFixed, scopeFor } from './scopes'

export interface ScopeInputs {
  place: Sig<GitPlace | undefined>
  repo: Sig<GitRepoLocal | undefined>
  picks: Sig<ReadonlyMap<string, string>>
  extras: Sig<ChangesScope[]>
}

export const currentScope = ({ place, repo, picks, extras }: ScopeInputs) => {
  const scopeId = derive(() => {
    const at = place.get()
    const local = repo.get()
    if (!at || !local) return undefined
    const picked = picks.get().get(placeKey(at))
    return picked && scopeFor(picked, extras.get()) ? picked : defaultScope(local)
  })
  const scope = derive(() => {
    const id = scopeId.get()
    return id === undefined ? undefined : scopeFor(id, extras.get())
  })
  const fixed = derive(() => {
    const id = scopeId.get()
    return id !== undefined && isFixed(id, extras.get())
  })
  return { scopeId, scope, fixed }
}
