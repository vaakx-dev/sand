import type { GitPlace } from '@sand/git/contract'
import { derive, read, untrack, type Sig } from '@vaakx-dev/vrui'
import type { ChangesScope } from '../contract'
import type { ScopeSources } from './sources'

export const scopeExtras = (place: Sig<GitPlace | undefined>, sources: ScopeSources) => {
  const followed = derive(() => {
    const at = place.get()
    const list = sources.list.get()
    return at ? untrack(() => list.map(source => source.scopes(at))) : []
  })
  return derive((): ChangesScope[] => followed.get().flatMap(found => read(found)))
}
